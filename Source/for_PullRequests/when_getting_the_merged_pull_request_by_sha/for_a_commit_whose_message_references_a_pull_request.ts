import { beforeEach, describe, it } from 'vitest';

import { PullRequest } from '../../PullRequest';
import { PullRequests } from '../../PullRequests';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// A squash or classic merge commit does not appear as any pull request's `merge_commit_sha`, but its message
// carries the pull request number, which is enough to look the pull request up.
describe('when getting the merged pull request by sha for a commit whose message references a pull request', () => {
    let result: PullRequest | undefined;

    beforeEach(async () => {
        const sha = 'abcabcabcabcabcabcabcabcabcabcabcabcabca';
        const fake: FakeOctokit = aFakeOctokit();
        fake.setAssociatedPullRequests([]);
        fake.getCommit.resolves({ data: { commit: { message: 'Merge pull request #11 from some/branch' } } });
        fake.pullsGet.resolves({
            data: aPullRequest({ number: 11, state: 'closed', merged: true, merged_at: '2026-07-23T10:00:00Z' })
        });

        const pullRequests = new PullRequests(fake.octokit, anActionContext(undefined, sha), new RecordingLogger());
        result = await pullRequests.getMergedPullRequest();
    });

    it('should return the pull request named in the commit message', () => {
        result?.number.should.equal(11);
    });
});
