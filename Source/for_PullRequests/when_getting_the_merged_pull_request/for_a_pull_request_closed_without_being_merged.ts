import { Octokit } from '@octokit/rest';
import { beforeEach, describe, it } from 'vitest';

import { PullRequest } from '../../PullRequest';
import { PullRequests } from '../../PullRequests';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest, testMergeCommitSha } from '../../specs/aPullRequest';
import { anActionContext } from '../../specs/anActionContext';

// A `pull_request` closed event reports the ephemeral merge commit as `github.sha`, and GitHub leaves that
// same SHA in `merge_commit_sha` when the pull request is closed without being merged. Matching on the SHA
// therefore made an abandoned pull request look merged.
describe('when getting the merged pull request for a pull request closed without being merged', () => {
    let result: PullRequest | undefined;

    beforeEach(async () => {
        const pullRequest = aPullRequest({
            state: 'closed',
            merged: false,
            merged_at: null,
            merge_commit_sha: testMergeCommitSha,
            labels: [{ name: 'patch' }]
        });

        const pullRequests = new PullRequests(
            {} as Octokit,
            anActionContext(pullRequest, testMergeCommitSha),
            new RecordingLogger());

        result = await pullRequests.getMergedPullRequest();
    });

    it('should not consider it merged, even though its merge commit matches the current sha', () => {
        (result === undefined).should.be.true;
    });
});
