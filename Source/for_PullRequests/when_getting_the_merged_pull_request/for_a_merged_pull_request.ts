import { Octokit } from '@octokit/rest';
import { beforeEach, describe, it } from 'vitest';

import { PullRequest } from '../../PullRequest';
import { PullRequests } from '../../PullRequests';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { anActionContext } from '../../specs/anActionContext';

describe('when getting the merged pull request for a merged pull request', () => {
    let result: PullRequest | undefined;

    beforeEach(async () => {
        const pullRequest = aPullRequest({
            state: 'closed',
            merged: true,
            merged_at: '2026-07-23T10:00:00Z',
            merge_commit_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
        });

        const pullRequests = new PullRequests(
            {} as Octokit,
            anActionContext(pullRequest),
            new RecordingLogger());

        result = await pullRequests.getMergedPullRequest();
    });

    it('should return the pull request from the event payload', () => {
        result?.number.should.equal(42);
    });
});
