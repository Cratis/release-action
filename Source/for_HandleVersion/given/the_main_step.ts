import { Octokit } from '@octokit/rest';

import { HandleVersion } from '../../HandleVersion';
import { IInputs } from '../../IInputs';
import { IReleaseDecisions } from '../../IReleaseDecisions';
import { PullRequest } from '../../PullRequest';
import { PullRequests } from '../../PullRequests';
import { ReleaseDecision } from '../../ReleaseDecision';
import { Versions } from '../../Versions';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { StubbedReleases, someReleases } from '../../specs/someReleases';

export const noInputs: IInputs = {
    gitHubToken: 'a-token',
    version: '',
    releaseNotes: '',
    tagPrefix: 'v',
    majorLabels: ['major'],
    minorLabels: ['minor'],
    patchLabels: ['patch'],
    noReleaseLabels: ['no-release']
};

/**
 * The main step wired up exactly as the action wires it, but around a pull request from the event payload -
 * so a spec exercises the real path from webhook payload all the way to the recorded decision.
 */
export class the_main_step {
    readonly releases: StubbedReleases = someReleases();
    readonly decisions: IReleaseDecisions;
    recorded: ReleaseDecision | undefined;

    constructor(readonly pullRequest: PullRequest, readonly inputs: IInputs = noInputs) {
        this.decisions = {
            record: decision => { this.recorded = decision; },
            read: () => this.recorded
        };
    }

    async run(): Promise<ReleaseDecision> {
        const logger = new RecordingLogger();
        const context = anActionContext(this.pullRequest);

        return await new HandleVersion(
            new PullRequests({} as Octokit, context, logger),
            new Versions(this.releases, logger),
            this.decisions,
            this.inputs,
            context,
            logger).run();
    }
}
