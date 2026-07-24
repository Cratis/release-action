import { beforeEach, describe, it } from 'vitest';

import { PullRequest } from '../../PullRequest';
import { PullRequests } from '../../PullRequests';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// A push-triggered run has no pull request in the event payload, so the pull request is found from the commit.
describe('when getting the merged pull request by sha for a commit that is a merge commit', () => {
    let result: PullRequest | undefined;

    beforeEach(async () => {
        const sha = 'abcabcabcabcabcabcabcabcabcabcabcabcabca';
        const fake: FakeOctokit = aFakeOctokit();
        fake.setAssociatedPullRequests([
            aPullRequest({ number: 7, state: 'closed', merged: true, merged_at: '2026-07-23T10:00:00Z', merge_commit_sha: sha })
        ]);

        const pullRequests = new PullRequests(fake.octokit, anActionContext(undefined, sha), new RecordingLogger());
        result = await pullRequests.getMergedPullRequest();
    });

    it('should return the pull request whose merge commit is that commit', () => {
        result?.number.should.equal(7);
    });
});
