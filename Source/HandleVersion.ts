import { SemVer } from 'semver';

import { IActionContext } from './IActionContext';
import { IInputs } from './IInputs';
import { ILogger } from './ILogger';
import { IPullRequests } from './IPullRequests';
import { IReleaseDecisions } from './IReleaseDecisions';
import { IVersions } from './IVersions';
import { ReleaseDecision, nothingToRelease } from './ReleaseDecision';
import { isFromDependabot } from './PullRequest';

/**
 * The main step of the action. Works out which version - if any - this run should produce, and records that
 * decision for the post step to act on.
 */
export class HandleVersion {

    constructor(
        readonly _pullRequests: IPullRequests,
        readonly _versions: IVersions,
        readonly _decisions: IReleaseDecisions,
        readonly _inputs: IInputs,
        readonly _context: IActionContext,
        readonly _logger: ILogger) {
    }

    async run(): Promise<ReleaseDecision> {
        let decision: ReleaseDecision;

        try {
            decision = await this.decide();
        } catch (ex) {
            this._logger.error('Something went wrong while working out the version to release.');
            this._logger.error(ex);
            decision = nothingToRelease;
        }

        this._decisions.record(decision);
        return decision;
    }

    private async decide(): Promise<ReleaseDecision> {
        if (this._inputs.version) return this.decideFromExplicitVersion(this._inputs.version);
        return await this.decideFromPullRequest();
    }

    private decideFromExplicitVersion(version: string): ReleaseDecision {
        // `0.0.0` is the placeholder default shipped in the `workflow_dispatch` inputs of the publish
        // templates. It is never a version anyone means to release - the first real release bumps up from
        // `0.0.0` to `0.0.1`/`0.1.0`/`1.0.0`. Treating it as nothing-to-release means a manual run left at the
        // default can never cut a bogus `0.0.0` release; provide a real version to force one.
        if (version === '0.0.0') {
            this._logger.info(
                "The version input is the placeholder '0.0.0' - nothing will be released. Provide a real version to force a release.");
            return nothingToRelease;
        }

        const semanticVersion = new SemVer(version);
        this._logger.info(`Using explicitly set version number '${semanticVersion.version}'.`);

        const releaseNotes = this._inputs.releaseNotes.trim();
        if (releaseNotes === '') {
            this._logger.info('No release notes provided - GitHub will generate them for the release.');
        }

        return {
            shouldPublish: true,
            shouldCreateRelease: true,
            version: semanticVersion.version,
            tag: this.tagFor(semanticVersion.version),
            isPrerelease: semanticVersion.prerelease.length > 0,
            isIsolatedForPullRequest: false,
            releaseNotes,
            previousVersion: '',
            targetCommitish: this._context.sha
        };
    }

    private async decideFromPullRequest(): Promise<ReleaseDecision> {
        const pullRequest = await this.getPullRequest();
        if (!pullRequest) return nothingToRelease;

        if (isFromDependabot(pullRequest)) {
            this._logger.info(
                `Pull request #${pullRequest.number} is from Dependabot (${pullRequest.user?.login}) - nothing will be released for it.`);
            return nothingToRelease;
        }

        const versionInfo = await this._versions.getNextVersionFor(pullRequest);
        const version = versionInfo.version;
        if (!version) return nothingToRelease;

        return {
            shouldPublish: true,

            // A prerelease is an artifact belonging to a pull request, not a release of the repository.
            shouldCreateRelease: !versionInfo.isPrerelease,
            version: version.version,
            tag: this.tagFor(version.version),
            isPrerelease: versionInfo.isPrerelease,
            isIsolatedForPullRequest: versionInfo.isIsolatedForPullRequest,
            releaseNotes: pullRequest.body ?? '',
            previousVersion: versionInfo.previousVersion,
            targetCommitish: pullRequest.merge_commit_sha ?? this._context.sha
        };
    }

    private tagFor(version: string): string {
        return `${this._inputs.tagPrefix}${version}`;
    }

    private async getPullRequest() {
        const merged = await this._pullRequests.getMergedPullRequest();
        if (merged) return merged;

        this._logger.info('No merged pull request found - falling back to the pull request of the current event.');

        const current = await this._pullRequests.getCurrentPullRequest();
        if (!current) this._logger.info('There is no pull request to work out a version from.');

        return current;
    }
}
