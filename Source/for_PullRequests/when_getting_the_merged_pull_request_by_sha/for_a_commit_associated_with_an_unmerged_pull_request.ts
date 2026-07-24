import { beforeEach, describe, it } from 'vitest';

import { PullRequest } from '../../PullRequest';
import { PullRequests } from '../../PullRequests';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// The only pull request associated with the commit was closed without being merged - the by-sha path must not
// fall back to treating it as the merged pull request.
describe('when getting the merged pull request by sha for a commit associated only with an unmerged pull request', () => {
    let result: PullRequest | undefined;

    beforeEach(async () => {
        const sha = 'abcabcabcabcabcabcabcabcabcabcabcabcabca';
        const fake: FakeOctokit = aFakeOctokit();
        fake.setAssociatedPullRequests([
            aPullRequest({ number: 7, state: 'closed', merged: false, merged_at: null, merge_commit_sha: sha })
        ]);
        fake.getCommit.resolves({ data: { commit: { message: 'Some regular commit' } } });

        const pullRequests = new PullRequests(fake.octokit, anActionContext(undefined, sha), new RecordingLogger());
        result = await pullRequests.getMergedPullRequest();
    });

    it('should not find a merged pull request', () => {
        (result === undefined).should.be.true;
    });
});
