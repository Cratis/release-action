import { beforeEach, describe, it } from 'vitest';

import { ReleaseDecision } from '../../ReleaseDecision';
import { aPullRequest, testMergeCommitSha } from '../../specs/aPullRequest';
import { the_main_step } from '../given/the_main_step';

// Re-running a workflow that already released must not release again. Deciding it here rather than only when
// the release is created is what makes `should-publish` false too, so the publishing jobs downstream skip
// along with it instead of pushing artifacts for a version that has no release.
describe('when running the main step for a merged pull request that was already released', () => {
    let decision: ReleaseDecision;

    beforeEach(async () => {
        const mainStep = new the_main_step(aPullRequest({
            state: 'closed',
            merged: true,
            merged_at: '2026-07-23T10:00:00Z',
            labels: [{ name: 'minor' }]
        }));

        mainStep.releases.existsForSha.withArgs(testMergeCommitSha).resolves(true);

        decision = await mainStep.run();
    });

    it('should not publish', () => {
        decision.shouldPublish.should.be.false;
    });

    it('should not create a release', () => {
        decision.shouldCreateRelease.should.be.false;
    });

    it('should say that it was already released', () => {
        decision.reason.should.equal('already-released');
    });
});
