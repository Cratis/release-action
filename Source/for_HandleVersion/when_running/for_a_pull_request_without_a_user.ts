import { beforeEach, describe, it } from 'vitest';

import { ReleaseDecision } from '../../ReleaseDecision';
import { aPullRequest } from '../../specs/aPullRequest';
import { the_main_step } from '../given/the_main_step';

// A pull request whose author has since been deleted comes back without a user - that must not be mistaken
// for a Dependabot pull request and silently swallow the release.
describe('when running the main step for a merged pull request without a user', () => {
    let decision: ReleaseDecision;

    beforeEach(async () => {
        decision = await new the_main_step(aPullRequest({
            state: 'closed',
            merged: true,
            merged_at: '2026-07-23T10:00:00Z',
            user: null,
            labels: [{ name: 'patch' }]
        })).run();
    });

    it('should publish', () => {
        decision.shouldPublish.should.be.true;
    });

    it('should bump the patch of the latest released version', () => {
        decision.version.should.equal('1.2.4');
    });
});
