import { beforeEach, describe, it } from 'vitest';

import { ReleaseDecision } from '../../ReleaseDecision';
import { aPullRequest } from '../../specs/aPullRequest';
import { the_main_step } from '../given/the_main_step';

// The reported symptom, end to end: closing a pull request that carries a release label - without merging it -
// must publish nothing and must not cut a GitHub release.
describe('when running the main step for a labeled pull request closed without being merged', () => {
    let decision: ReleaseDecision;

    beforeEach(async () => {
        decision = await new the_main_step(aPullRequest({
            state: 'closed',
            merged: false,
            merged_at: null,
            labels: [{ name: 'patch' }]
        })).run();
    });

    it('should not publish', () => {
        decision.shouldPublish.should.be.false;
    });

    it('should not create a release', () => {
        decision.shouldCreateRelease.should.be.false;
    });

    it('should not produce a version', () => {
        decision.version.should.equal('');
    });
});
