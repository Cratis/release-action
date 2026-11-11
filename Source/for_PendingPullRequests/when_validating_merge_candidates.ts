// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { beforeEach, describe, it } from 'vitest';
import sinon from 'sinon';

import { PendingPullRequests } from '../PendingPullRequests';
import { RecordingLogger } from '../specs/RecordingLogger';
import { aFakeOctokit, FakeOctokit } from '../specs/aFakeOctokit';
import { aPullRequest } from '../specs/aPullRequest';
import { anActionContext } from '../specs/anActionContext';
import { someReleases } from '../specs/someReleases';

let fake: FakeOctokit;
let collector: PendingPullRequests;
beforeEach(() => {
    fake = aFakeOctokit();
    collector = new PendingPullRequests(fake.octokit,
        { ...someReleases(), getLatestReleaseCommit: async () => 'lower' }, anActionContext(), new RecordingLogger());
    fake.octokit.repos.compareCommitsWithBasehead = sinon.stub().resolves({ data: { status: 'ahead', ahead_by: 1 } }) as unknown as
        typeof fake.octokit.repos.compareCommitsWithBasehead;
});

describe('when a merge message names a different matching pull request', () => {
    it('should reject even when the returned pull request matches the commit and branch', async () => {
        fake.getCommit.resolves({ data: { sha: 'merge', parents: [{ sha: 'lower' }, { sha: 'feature' }],
            commit: { message: 'Merge pull request #2 from feature' } } });
        fake.pullsGet.resolves({ data: aPullRequest({ number: 3, merged: true, merge_commit_sha: 'merge' }) });
        let message = '';
        try { await collector.get('merge'); } catch (error) { message = String(error); }
        message.should.equal('Error: Pull request #2 is not a matching merge into main.');
        fake.paginate.called.should.be.false;
    });
});

describe('when a merge commit has no numbered merge message', () => {
    it('should collect its matching associated pull request instead', async () => {
        fake.getCommit.resolves({ data: { sha: 'merge', parents: [{ sha: 'lower' }, { sha: 'feature' }],
            commit: { message: 'Merge branch feature' } } });
        const pullRequest = aPullRequest({ number: 3, merged: true, merge_commit_sha: 'merge' });
        fake.setAssociatedPullRequests([pullRequest]);
        const result = await collector.get('merge');
        result.should.deep.equal({ pullRequests: [pullRequest], fallback: false });
        fake.pullsGet.called.should.be.false;
        fake.paginate.firstCall.args[1].should.deep.equal({
            owner: 'cratis', repo: 'release-action', commit_sha: 'merge', per_page: 100
        });
    });
});
