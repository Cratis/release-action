import { SemVer } from 'semver';

import { AggregatedReleaseNotes } from './AggregatedReleaseNotes';
import { IPendingPullRequests } from './IPendingPullRequests';
import { IActionContext } from './IActionContext';
import { IInputs } from './IInputs';
import { ILogger } from './ILogger';
import { IPullRequests } from './IPullRequests';
import { IReleaseDecisions } from './IReleaseDecisions';
import { IVersions } from './IVersions';
import { ReleaseDecision, nothingToRelease } from './ReleaseDecision';
import { PullRequest, isFromDependabot, isMerged } from './PullRequest';

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
        readonly _logger: ILogger,
        readonly _pending?: IPendingPullRequests) {
    }

    async run(): Promise<ReleaseDecision> {
        let decision: ReleaseDecision;

        try {
            decision = await this.decide();
        } catch (ex) {
            this._logger.error('Something went wrong while working out the version to release.');
            this._logger.error(ex);
            decision = nothingToRelease('error');
        }

        this._decisions.record(decision);
        return decision;
    }

    private async decide(): Promise<ReleaseDecision> {
        const manualBatch = this._context.eventName === 'workflow_dispatch' && this._inputs.version === '0.0.0';
        if ((this._inputs.releaseWindow ?? 0) > 0 && (!this._inputs.version || manualBatch)) {
            return await this.decideFromPendingPullRequests();
        }
        if (this._inputs.version) return this.decideFromExplicitVersion(this._inputs.version);
        return await this.decideFromPullRequest();
    }

    private async decideFromPendingPullRequests(): Promise<ReleaseDecision> {
        const eventPullRequest = this._context.payload.pull_request as unknown as PullRequest | undefined;
        if (eventPullRequest && !isMerged(eventPullRequest)) return await this.decideFromPullRequest();
        const upper = eventPullRequest?.merge_commit_sha ?? this._context.sha;
        if (!this._pending) throw new Error('Pending pull request collection is unavailable.');
        const pending = await this._pending.get(upper);
        if (pending.fallback) return await this.decideFromPullRequest();

        const { owner, repo } = this._context.repo;
        const included = AggregatedReleaseNotes.included(pending.pullRequests, `${owner}/${repo}`, this._inputs);
        const pullRequests = included.map(pullRequest => pullRequest.number);
        const skip = (reason: Parameters<typeof nothingToRelease>[0]) => ({ ...nothingToRelease(reason), pullRequests });
        if (!included.length) return skip('nothing-pending');
        const intents = included.flatMap(pullRequest => AggregatedReleaseNotes.intents(pullRequest, this._inputs));
        const bump = (['major', 'minor', 'patch'] as const).find(intent => intents.includes(intent));
        if (!bump) return skip('no-label');

        const manual = this._context.eventName === 'workflow_dispatch';
        const hotfix = included.some(pullRequest => pullRequest.labels.some(label =>
            (this._inputs.hotfixLabels ?? ['hotfix']).includes(label.name ?? '')));
        const major = included.find(pullRequest => AggregatedReleaseNotes.intents(pullRequest, this._inputs).includes('major'));
        if (hotfix && major && !manual) {
            const failureMessage = `A major change is pending (#${major.number}); hotfix releases cannot include it. Run Publish manually (workflow_dispatch) to release it.`;
            // Fail once, on the run the merge started. Scheduled ticks see the same pending range until someone
            // releases it by hand, so failing there would turn every tick red without adding information.
            if (this._context.eventName === 'schedule') {
                this._logger.warn(failureMessage);
                return skip('batched');
            }
            this._logger.error(failureMessage);
            return { ...skip('error'), failureMessage };
        }
        if (!manual && !hotfix && !this.windowElapsed(included)) return skip('batched');
        if (!this._versions.nextVersionFor) throw new Error('Batch version selection is unavailable.');
        const versionInfo = await this._versions.nextVersionFor(bump, upper);
        if (!versionInfo.version) return skip(versionInfo.reason ?? 'no-label');
        return {
            shouldPublish: true,
            shouldCreateRelease: true,
            version: versionInfo.version.version,
            tag: this.tagFor(versionInfo.version.version),
            isPrerelease: false,
            isIsolatedForPullRequest: false,
            releaseNotes: AggregatedReleaseNotes.merge(included, this._logger),
            previousVersion: versionInfo.previousVersion,
            targetCommitish: upper,
            reason: 'release',
            pullRequests
        };
    }

    private windowElapsed(pullRequests: PullRequest[]): boolean {
        const times = pullRequests.map(pullRequest => Date.parse(pullRequest.merged_at ?? ''));
        if (times.some(time => !Number.isFinite(time))) throw new Error('A pending pull request has no valid merge timestamp.');
        return Date.now() - Math.min(...times) >= (this._inputs.releaseWindow ?? 0) * 60_000;
    }

    private decideFromExplicitVersion(version: string): ReleaseDecision {
        // `0.0.0` is the placeholder default shipped in the `workflow_dispatch` inputs of the publish
        // templates. It is never a version anyone means to release - the first real release bumps up from
        // `0.0.0` to `0.0.1`/`0.1.0`/`1.0.0`. Treating it as nothing-to-release means a manual run left at the
        // default can never cut a bogus `0.0.0` release; provide a real version to force one.
        if (version === '0.0.0') {
            this._logger.info(
                "The version input is the placeholder '0.0.0' - nothing will be released. Provide a real version to force a release.");
            return nothingToRelease('placeholder-version');
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
            targetCommitish: this._context.sha,
            reason: semanticVersion.prerelease.length > 0 ? 'prerelease' : 'release'
        };
    }

    private async decideFromPullRequest(): Promise<ReleaseDecision> {
        const pullRequest = await this.getPullRequest();
        if (!pullRequest) return nothingToRelease('no-pull-request');

        if (isFromDependabot(pullRequest)) {
            this._logger.info(
                `Pull request #${pullRequest.number} is from Dependabot (${pullRequest.user?.login}) - nothing will be released for it.`);
            return nothingToRelease('dependabot');
        }

        const versionInfo = await this._versions.getNextVersionFor(pullRequest);
        const version = versionInfo.version;

        // `getNextVersionFor` knows which of the no-release paths it took; anything it did not name is a
        // merged pull request that carried no label, which is the one worth failing a workflow over.
        if (!version) return nothingToRelease(versionInfo.reason ?? 'no-label');

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
            targetCommitish: pullRequest.merge_commit_sha ?? this._context.sha,
            reason: versionInfo.isPrerelease ? 'prerelease' : 'release'
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
