import { beforeEach, describe, it } from 'vitest';

import { HandleVersion } from '../../HandleVersion';
import { IReleaseDecisions } from '../../IReleaseDecisions';
import { IVersions } from '../../IVersions';
import { ReleaseDecision } from '../../ReleaseDecision';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { anActionContext } from '../../specs/anActionContext';
import { noInputs } from '../given/the_main_step';

// The action must fail closed: any failure while working out the version results in nothing being released,
// never a partial or accidental publish.
describe('when working out the version fails', () => {
    let recorded: ReleaseDecision | undefined;
    let result: ReleaseDecision;

    beforeEach(async () => {
        const pullRequest = aPullRequest({ state: 'closed', merged: true, merged_at: '2026-07-23T10:00:00Z', labels: [{ name: 'patch' }] });
        const pullRequests = { getMergedPullRequest: async () => pullRequest, getCurrentPullRequest: async () => undefined };
        const versions: IVersions = { getNextVersionFor: async () => { throw new Error('boom'); } };
        const decisions: IReleaseDecisions = { record: decision => { recorded = decision; }, read: () => recorded };

        result = await new HandleVersion(pullRequests, versions, decisions, noInputs, anActionContext(pullRequest), new RecordingLogger()).run();
    });

    it('should decide to release nothing', () => {
        result.shouldPublish.should.be.false;
    });

    it('should record that decision for the post step', () => {
        recorded?.shouldCreateRelease.should.be.false;
    });
});
