import { beforeEach, describe, it } from 'vitest';

import { PullRequest } from '../../PullRequest';
import { PullRequests } from '../../PullRequests';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

describe('when getting the current pull request from the event payload', () => {
    let result: PullRequest | undefined;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        const pullRequest = aPullRequest({ number: 99, state: 'open' });

        const pullRequests = new PullRequests(fake.octokit, anActionContext(pullRequest), new RecordingLogger());
        result = await pullRequests.getCurrentPullRequest();
    });

    it('should return the pull request from the payload', () => {
        result?.number.should.equal(99);
    });
});
