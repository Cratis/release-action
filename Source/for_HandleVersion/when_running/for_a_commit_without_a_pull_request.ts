import { beforeEach, describe, it } from 'vitest';

import { HandleVersion } from '../../HandleVersion';
import { IReleaseDecisions } from '../../IReleaseDecisions';
import { IVersions } from '../../IVersions';
import { ReleaseDecision } from '../../ReleaseDecision';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { noInputs } from '../given/the_main_step';

// A commit pushed straight to the branch rather than merged through a pull request. Releasing nothing is
// correct - and saying so is what stops a workflow triggered on push from treating every such commit as a
// release that went missing.
describe('when running the main step for a commit without a pull request', () => {
    let recorded: ReleaseDecision | undefined;
    let result: ReleaseDecision;

    beforeEach(async () => {
        const pullRequests = { getMergedPullRequest: async () => undefined, getCurrentPullRequest: async () => undefined };
        const versions: IVersions = { getNextVersionFor: async () => { throw new Error('should never be asked'); } };
        const decisions: IReleaseDecisions = { record: decision => { recorded = decision; }, read: () => recorded };

        result = await new HandleVersion(pullRequests, versions, decisions, noInputs, anActionContext(), new RecordingLogger()).run();
    });

    it('should decide to release nothing', () => {
        result.shouldPublish.should.be.false;
    });

    it('should say that there was no pull request', () => {
        result.reason.should.equal('no-pull-request');
    });
});
