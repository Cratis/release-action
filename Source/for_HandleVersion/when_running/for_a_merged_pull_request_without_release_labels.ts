import { beforeEach, describe, it } from 'vitest';

import { ReleaseDecision } from '../../ReleaseDecision';
import { aPullRequest } from '../../specs/aPullRequest';
import { the_main_step } from '../given/the_main_step';

// The reason that matters most. A merged pull request nobody labeled publishes nothing while every job in the
// workflow reports success, so the merge reads as a release that happened. Naming it is what lets a workflow
// fail on this without also failing on the no-releases that are perfectly normal.
describe('when running the main step for a merged pull request without release labels', () => {
    let decision: ReleaseDecision;

    beforeEach(async () => {
        decision = await new the_main_step(aPullRequest({
            state: 'closed',
            merged: true,
            merged_at: '2026-07-23T10:00:00Z',
            labels: [{ name: 'documentation' }]
        })).run();
    });

    it('should not publish', () => {
        decision.shouldPublish.should.be.false;
    });

    it('should say that there was no label', () => {
        decision.reason.should.equal('no-label');
    });
});
