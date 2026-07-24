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
            const releases = await this.getAll();

            // Drafts have no tag in the repository yet, and this action never publishes prereleases - so
            // neither can be the basis for the next release version.
            const versions = releases
                .filter(release => !release.draft && !release.prerelease)
                .map(release => semver.parse(this.stripTagPrefix(release.tag_name)))
                .filter((version): version is SemVer => version !== null && version.prerelease.length === 0)
                .sort(semver.rcompare);

            if (versions.length === 0) {
                this._logger.info('The repository has no releases yet - starting from 0.0.0.');
                return noReleasesYet();
            }

            this._logger.info(`Latest released version: ${versions[0].version}`);
            return versions[0];
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
}
