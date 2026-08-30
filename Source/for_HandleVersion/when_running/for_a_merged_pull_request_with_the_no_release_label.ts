import { beforeEach, describe, it } from 'vitest';

import { ReleaseDecision } from '../../ReleaseDecision';
import { aPullRequest } from '../../specs/aPullRequest';
import { the_main_step } from '../given/the_main_step';

// A pull request labelled no-release deliberately publishes nothing - that must reach the workflow as its own
// reason, not as 'no-label', or a legitimate no-release decision fails the same alarm a forgotten label would.
describe('when running the main step for a merged pull request with the no-release label', () => {
    let decision: ReleaseDecision;

    beforeEach(async () => {
        decision = await new the_main_step(aPullRequest({
            state: 'closed',
            merged: true,
            merged_at: '2026-07-23T10:00:00Z',
            labels: [{ name: 'no-release' }]
        })).run();
    });

    it('should not publish', () => {
        decision.shouldPublish.should.be.false;
    });

    it('should say that it was labelled no-release', () => {
        decision.reason.should.equal('no-release');
    });
});
