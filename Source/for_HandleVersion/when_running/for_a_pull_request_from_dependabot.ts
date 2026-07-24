import { beforeEach, describe, it } from 'vitest';

import { ReleaseDecision } from '../../ReleaseDecision';
import { aPullRequest } from '../../specs/aPullRequest';
import { the_main_step } from '../given/the_main_step';

describe('when running the main step for a merged pull request from dependabot', () => {
    let decision: ReleaseDecision;

    beforeEach(async () => {
        decision = await new the_main_step(aPullRequest({
            state: 'closed',
            merged: true,
            merged_at: '2026-07-23T10:00:00Z',
            user: { login: 'dependabot[bot]' },
            labels: [{ name: 'patch' }]
        })).run();
    });

    it('should not publish', () => {
        decision.shouldPublish.should.be.false;
    });
});
