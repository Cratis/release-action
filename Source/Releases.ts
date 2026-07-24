import { Octokit } from '@octokit/rest';
import semver, { SemVer } from 'semver';

import { IActionContext } from './IActionContext';
import { ILogger } from './ILogger';
import { IReleases } from './IReleases';
import { Release } from './Release';

type ExistingRelease = {
    tag_name: string;
    target_commitish: string;
    draft: boolean;
    prerelease: boolean;
};

type ExistingTag = {
    name: string;
};

// A fresh instance every time - `SemVer.inc()` mutates in place, so callers must never share one.
const noReleasesYet = () => new SemVer('0.0.0');

export class Releases implements IReleases {

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

    async existsForTag(tag: string): Promise<boolean> {
        const { owner, repo } = this._context.repo;

        try {
            await this._octokit.repos.getReleaseByTag({ owner, repo, tag });
            this._logger.info(`A release already exists for tag '${tag}'.`);
            return true;
        } catch (ex) {
            if ((ex as { status?: number }).status === 404) return false;
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
            // GitHub answers 422 when a release for the tag already exists. The pre-flight checks catch the
            // common case; this closes the race where a concurrent run created it in between, so a re-run or
            // a parallel job never fails on an already-published release.
            if ((ex as { status?: number }).status === 422) {
                this._logger.warn(`A release for '${release.tag}' already exists - skipping.`);
                return;
            }
            throw ex;
        }
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

    private async getAll(): Promise<ExistingRelease[]> {
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
