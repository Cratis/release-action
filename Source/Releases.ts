import { Octokit } from '@octokit/rest';
import semver, { SemVer } from 'semver';

import { IActionContext } from './IActionContext';
import { ILogger } from './ILogger';
import { IReleases } from './IReleases';
import { Release } from './Release';
import { VersionClaimedByAnotherCommit } from './VersionClaimedByAnotherCommit';

type ExistingRelease = {
    tag_name: string;
    target_commitish: string;
    draft: boolean;
    prerelease: boolean;
};

type ExistingTag = {
    name: string;
};

const commitSha = /^[0-9a-f]{40}$/i;

// A fresh instance every time - `SemVer.inc()` mutates in place, so callers must never share one.
const noReleasesYet = () => new SemVer('0.0.0');

export class Releases implements IReleases {

    // Listing the releases pages through every release the repository has ever had, and a single run asks for
    // them more than once - to work out the latest version, and to check whether this commit was already
    // released. Holding the first answer for the lifetime of the run keeps that to one round of pagination.
    private _all: Promise<ExistingRelease[]> | undefined;

    constructor(
        readonly _octokit: Octokit,
        readonly _context: IActionContext,
        readonly _logger: ILogger,
        readonly _tagPrefix: string = 'v') {
    }

    async getLatestReleaseVersion(): Promise<SemVer> {
        try {
            const fromReleases = this.highest(this.releaseVersions(await this.getAll()));
            if (fromReleases) {
                this._logger.info(`Latest released version: ${fromReleases.version}`);
                return fromReleases;
            }

            // Bootstrapping: a repository can have version tags before it has any GitHub releases - a floating
            // `v1` alias, or version tags pushed without a release. Basing the first release on the highest
            // such tag keeps the versioning continuous instead of restarting from 0.0.0.
            const fromTags = this.highest(this.tagVersions(await this.getTags()));
            if (fromTags) {
                this._logger.info(`No releases yet - basing the next version on the latest tag: ${fromTags.version}`);
                return fromTags;
            }

            this._logger.info('The repository has no releases or version tags yet - starting from 0.0.0.');
            return noReleasesYet();
        } catch (ex) {
            this._logger.warn('Could not determine the latest released version - defaulting to 0.0.0.');
            this._logger.warn(ex);
            return noReleasesYet();
        }
    }

    async targetOf(tag: string): Promise<string | undefined> {
        const { owner, repo } = this._context.repo;

        try {
            const existing = await this._octokit.repos.getReleaseByTag({ owner, repo, tag });
            const target = await this.commitOf(tag, existing.data.target_commitish);
            this._logger.info(`A release already exists for tag '${tag}', pointing at '${target}'.`);
            return target;
        } catch (ex) {
            if ((ex as { status?: number }).status === 404) return undefined;
            throw ex;
        }
    }

    /**
     * The commit a release points at. This action always creates releases with a commit, but a release created by
     * hand records the branch it was cut from - `main` - and only its tag says which commit that was.
     */
    private async commitOf(tag: string, targetCommitish: string): Promise<string> {
        if (commitSha.test(targetCommitish)) return targetCommitish;

        const { owner, repo } = this._context.repo;
        try {
            const ref = await this._octokit.git.getRef({ owner, repo, ref: `tags/${tag}` });
            if (ref.data.object.type !== 'tag') return ref.data.object.sha;

            // An annotated tag points at a tag object, which in turn points at the commit.
            const annotated = await this._octokit.git.getTag({ owner, repo, tag_sha: ref.data.object.sha });
            return annotated.data.object.sha;
        } catch (ex) {
            // A draft release has no tag yet - all there is to compare is what the release itself records.
            if ((ex as { status?: number }).status === 404) return targetCommitish;
            throw ex;
        }
    }

    async existsForSha(sha: string): Promise<boolean> {
        const existing = (await this.getAll()).find(release => release.target_commitish === sha);
        if (existing) {
            this._logger.info(`A release already exists for commit '${sha}': ${existing.tag_name}`);
            return true;
        }

        return false;
    }

    async create(release: Release): Promise<void> {
        const { owner, repo } = this._context.repo;

        try {
            await this._octokit.repos.createRelease({
                owner,
                repo,
                tag_name: release.tag,
                name: release.name,
                body: release.notes,
                generate_release_notes: release.generateNotes,
                prerelease: release.isPrerelease,
                target_commitish: release.targetCommitish
            });
        } catch (ex) {
            if ((ex as { status?: number }).status !== 422) throw ex;
            await this.reconcileWithExisting(release, ex);
        }
    }

    /**
     * GitHub answers 422 when a release for the tag already exists - which the pre-flight checks only miss when a
     * concurrent run created it in between. The answer alone cannot say whose release that is: the same commit's
     * means a parallel job already did this work, while another commit's means this run lost the version and must
     * not carry on as though it had won. Reading the release back tells the two apart.
     */
    private async reconcileWithExisting(release: Release, rejection: unknown): Promise<void> {
        const existingTarget = await this.targetOf(release.tag);

        // No release for the tag after all, so the 422 was about something else in the request.
        if (existingTarget === undefined) throw rejection;

        if (existingTarget !== release.targetCommitish) {
            throw new VersionClaimedByAnotherCommit(release.tag, existingTarget, release.targetCommitish);
        }

        this._logger.warn(`A release for '${release.tag}' already exists for this commit - skipping.`);
    }

    // Drafts have no tag in the repository yet, and this action never publishes prereleases, so neither can be
    // the basis for the next release version.
    private releaseVersions(releases: ExistingRelease[]): SemVer[] {
        return releases
            .filter(release => !release.draft && !release.prerelease)
            .map(release => semver.parse(this.stripTagPrefix(release.tag_name)))
            .filter((version): version is SemVer => version !== null && version.prerelease.length === 0);
    }

    private tagVersions(tags: ExistingTag[]): SemVer[] {
        return tags
            .map(tag => this.coerceTag(tag.name))
            .filter((version): version is SemVer => version !== null);
    }

    private highest(versions: SemVer[]): SemVer | undefined {
        return [...versions].sort(semver.rcompare)[0];
    }

    // Coerces a version-looking tag (`v1`, `v1.2`, `v1.2.3`) into a version. Tags that do not start with a
    // number once the prefix is removed are ignored, so a `latest` or `release-candidate` tag is never
    // mistaken for a version.
    private coerceTag(tag: string): SemVer | null {
        const stripped = this.stripTagPrefix(tag);
        return /^\d/.test(stripped) ? semver.coerce(stripped) : null;
    }

    private stripTagPrefix(tag: string): string {
        return tag.toLowerCase().startsWith(this._tagPrefix.toLowerCase())
            ? tag.substring(this._tagPrefix.length)
            : tag;
    }

    private getAll(): Promise<ExistingRelease[]> {
        this._all ??= this.listAll();
        return this._all;
    }

    private async listAll(): Promise<ExistingRelease[]> {
        const releases = await this._octokit.paginate(
            this._octokit.repos.listReleases,
            {
                owner: this._context.repo.owner,
                repo: this._context.repo.repo,
                per_page: 100
            });

        return releases as unknown as ExistingRelease[];
    }

    private async getTags(): Promise<ExistingTag[]> {
        const tags = await this._octokit.paginate(
            this._octokit.repos.listTags,
            {
                owner: this._context.repo.owner,
                repo: this._context.repo.repo,
                per_page: 100
            });

        return tags as unknown as ExistingTag[];
    }
}
