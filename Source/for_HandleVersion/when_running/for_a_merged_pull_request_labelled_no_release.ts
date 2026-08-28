import { beforeEach, describe, it } from 'vitest';

import { ReleaseDecision } from '../../ReleaseDecision';
import { aPullRequest } from '../../specs/aPullRequest';
import { the_main_step } from '../given/the_main_step';

// The deliberate twin of `no-label`. A merge labelled no-release publishes nothing because someone decided it
// should not - the reason has to say so, or a workflow that fails on lost releases would fail on decided ones.
describe('when running the main step for a merged pull request labelled no-release', () => {
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

    it('should say that not releasing was the decision', () => {
        decision.reason.should.equal('no-release');
    });
});
