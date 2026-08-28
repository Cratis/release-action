import semver, { SemVer } from 'semver';

import { ILogger } from './ILogger';
import { IReleaseOptions, defaultReleaseOptions } from './IReleaseOptions';
import { IReleases } from './IReleases';
import { IVersions } from './IVersions';
import { PullRequest, isClosedWithoutBeingMerged, isMerged } from './PullRequest';
import { VersionInfo } from './VersionInfo';

type Bump = 'major' | 'minor' | 'patch';

export class Versions implements IVersions {
    constructor(
        readonly _releases: IReleases,
        readonly _logger: ILogger,
        readonly _options: IReleaseOptions = defaultReleaseOptions) {
    }

    async getNextVersionFor(pullRequest: PullRequest): Promise<VersionInfo> {
        // A pull request that was closed without being merged never contributed anything to the target
        // branch, so it must never produce a version - regardless of which release labels it carries.
        if (isClosedWithoutBeingMerged(pullRequest)) {
            this._logger.info(
                `Pull request #${pullRequest.number} was closed without being merged - nothing will be released for it.`);
            return VersionInfo.noReleaseBecause('not-merged');
        }

        return isMerged(pullRequest)
            ? await this.getReleaseVersion(pullRequest)
            : await this.getPrereleaseVersion(pullRequest);
    }

    /**
     * A merged pull request produces a plain release, bumped from the latest release according to its label.
     *
     * The branch name is deliberately ignored here: naming a branch after a version is a prerelease concept
     * for pull request builds, not a way to pick the released version. Bumping a branch-derived prerelease
     * would also misbehave - `semver.inc` does not increment a prerelease the way it increments a release.
     */
    private async getReleaseVersion(pullRequest: PullRequest): Promise<VersionInfo> {
        // A no-release label states the decision a missing label leaves open: this merge deliberately publishes
        // nothing. Checked before the bump so that suppression always wins - a pull request carrying both has
        // already slipped past whatever gate should have rejected it, and releasing is the irreversible answer.
        if (this.hasNoReleaseLabel(pullRequest)) {
            this._logger.info(
                `Pull request #${pullRequest.number} is labelled as no-release - nothing will be released for it, by decision.`);
            return VersionInfo.noReleaseBecause('no-release');
        }

        const bump = this.getBump(pullRequest);
        if (!bump) {
            this._logger.info('No release related labels associated with the pull request.');
            this.logLabels(pullRequest);
            return VersionInfo.noReleaseBecause('no-label');
        }

        // Re-running a workflow that already released would bump from the version it just released and cut a
        // second, higher one from the same commit - and, worse, publish artifacts for it before the post step
        // gets a chance to notice. Deciding it here rather than only when creating the release means
        // `should-publish` is false too, so the publishing jobs downstream skip along with it.
        const alreadyReleased = pullRequest.merge_commit_sha
            && await this._releases.existsForSha(pullRequest.merge_commit_sha);

        if (alreadyReleased) {
            this._logger.info(
                `A release already exists for commit '${pullRequest.merge_commit_sha}' - nothing will be released again.`);
            return VersionInfo.noReleaseBecause('already-released');
        }

        const latest = await this._releases.getLatestReleaseVersion();

        // Capture the predecessor before bumping - `semver.inc` mutates in place, so after the bump `latest`
        // would already be the new version.
        const previousVersion = latest.version;
        const version = latest.inc(bump);
        this._logger.info(`New version is '${version.version}'`);

        return VersionInfo.releaseOf(version, false, previousVersion);
    }

    /**
     * An unmerged pull request only ever produces a prerelease artifact belonging to that pull request - from
     * a version-named branch, or from the latest release while the pull request is a draft.
     */
    private async getPrereleaseVersion(pullRequest: PullRequest): Promise<VersionInfo> {
        const fromBranch = this.getVersionFromBranch(pullRequest);
        if (fromBranch) {
            this._logger.info(`New version is '${fromBranch.version}'`);
            return VersionInfo.releaseOf(fromBranch, this.isIsolatedForPullRequest(fromBranch, pullRequest));
        }

        if (!pullRequest.draft) {
            this._logger.info('Pull request is not in draft - no prerelease will be produced for it.');
            return VersionInfo.noReleaseBecause('no-prerelease-version');
        }

        const latest = await this._releases.getLatestReleaseVersion();
        const version = new SemVer(`${latest.version}-${this.marker(pullRequest)}.${this.shortHeadSha(pullRequest)}`);
        this._logger.info(`New version is '${version.version}'`);

        return VersionInfo.releaseOf(version, this.isIsolatedForPullRequest(version, pullRequest), latest.version);
    }

    /**
     * The release label that decides the bump, with major taking precedence over minor over patch. Which label
     * names count is configurable, so a repository can keep its own conventions.
     */
    private getBump(pullRequest: PullRequest): Bump | undefined {
        const has = (names: readonly string[]) => pullRequest.labels.some(label => names.includes(label.name ?? ''));

        if (has(this._options.majorLabels)) return 'major';
        if (has(this._options.minorLabels)) return 'minor';
        if (has(this._options.patchLabels)) return 'patch';
        return undefined;
    }

    /**
     * Whether the pull request carries a label that means it deliberately publishes nothing. Which label
     * names count is configurable, like the bump labels.
     */
    private hasNoReleaseLabel(pullRequest: PullRequest): boolean {
        return pullRequest.labels.some(label => this._options.noReleaseLabels.includes(label.name ?? ''));
    }

    /**
     * A version is isolated to a pull request when it is a prerelease stamped with that pull request's own
     * marker - `1.2.3-pr42.abc1234`. A version derived from a named prerelease channel (`1.2.3-alpha.abc1234`)
     * is shared with everything else on that channel.
     */
    private isIsolatedForPullRequest(version: SemVer, pullRequest: PullRequest): boolean {
        return version.prerelease.length > 0 && version.prerelease[0] === this.marker(pullRequest);
    }

    /**
     * Derives a prerelease from a branch that is named after a semantic version. The head branch wins over the
     * base branch.
     */
    private getVersionFromBranch(pullRequest: PullRequest): SemVer | undefined {
        const fromBranch = semver.parse(pullRequest.head.ref) ?? semver.parse(pullRequest.base.ref);
        if (!fromBranch) return undefined;

        const shortSha = this.shortHeadSha(pullRequest);
        const base = `${fromBranch.major}.${fromBranch.minor}.${fromBranch.patch}`;

        return fromBranch.prerelease.length === 0
            ? new SemVer(`${base}-${this.marker(pullRequest)}.${shortSha}`)
            : new SemVer(`${base}-${fromBranch.prerelease[0]}.${shortSha}`);
    }

    private logLabels(pullRequest: PullRequest): void {
        if (pullRequest.labels.length === 0) return;

        this._logger.info('Labels associated with the pull request:');
        pullRequest.labels.forEach(label => this._logger.info(`  - ${label.name}`));
    }

    private marker(pullRequest: PullRequest): string {
        return `pr${pullRequest.number}`;
    }

    private shortHeadSha(pullRequest: PullRequest): string {
        return pullRequest.head.sha.substring(0, 7);
    }
}
