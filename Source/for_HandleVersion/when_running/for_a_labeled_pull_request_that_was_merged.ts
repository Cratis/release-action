import { beforeEach, describe, it } from 'vitest';

import { ReleaseDecision } from '../../ReleaseDecision';
import { aPullRequest } from '../../specs/aPullRequest';
import { the_main_step } from '../given/the_main_step';

describe('when running the main step for a labeled pull request that was merged', () => {
    let decision: ReleaseDecision;

    beforeEach(async () => {
        decision = await new the_main_step(aPullRequest({
            state: 'closed',
            merged: true,
            merged_at: '2026-07-23T10:00:00Z',
            merge_commit_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            body: 'What changed',
            labels: [{ name: 'minor' }]
        })).run();
    });

    it('should publish', () => {
        decision.shouldPublish.should.be.true;
    });

    it('should create a release', () => {
        decision.shouldCreateRelease.should.be.true;
    });

    it('should bump the minor of the latest released version', () => {
        decision.version.should.equal('1.3.0');
    });

    it('should take the release notes from the pull request body', () => {
        decision.releaseNotes.should.equal('What changed');
    });

    it('should point the release at the merge commit', () => {
        decision.targetCommitish.should.equal('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    });

    it('should say that it is a release', () => {
        decision.reason.should.equal('release');
    });
});
