import { beforeEach, describe, it } from 'vitest';

import { PullRequest } from '../../PullRequest';
import { PullRequests } from '../../PullRequests';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

describe('when getting the current pull request without a pull request in the event', () => {
    let result: PullRequest | undefined;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();

        const pullRequests = new PullRequests(fake.octokit, anActionContext(undefined), new RecordingLogger());
        result = await pullRequests.getCurrentPullRequest();
    });

    it('should not find a pull request', () => {
        (result === undefined).should.be.true;
    });
});
