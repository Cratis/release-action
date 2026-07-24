import { Octokit } from '@octokit/rest';
import { beforeEach, describe, it } from 'vitest';

import { PullRequest } from '../../PullRequest';
import { PullRequests } from '../../PullRequests';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { anActionContext } from '../../specs/anActionContext';

// The list endpoints omit `merged` altogether, so `merged_at` has to be enough on its own.
describe('when getting the merged pull request for a pull request that only carries a merged timestamp', () => {
    let result: PullRequest | undefined;

    beforeEach(async () => {
        const pullRequest = aPullRequest({
            state: 'closed',
            merged: undefined,
            merged_at: '2026-07-23T10:00:00Z'
        });

        const pullRequests = new PullRequests(
            {} as Octokit,
            anActionContext(pullRequest),
            new RecordingLogger());

        result = await pullRequests.getMergedPullRequest();
    });

    it('should consider it merged', () => {
        result?.number.should.equal(42);
    });
});
