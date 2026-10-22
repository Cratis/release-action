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
import { IPendingPullRequests } from '../IPendingPullRequests';

let fake: FakeOctokit;
let logger: RecordingLogger;
let collector: PendingPullRequests;
let compare: ReturnType<typeof sinon.stub>;
let result: Awaited<ReturnType<IPendingPullRequests['get']>>;
const merged = (number: number, sha = `merge-${number}`) => aPullRequest({ number, merged: true, merge_commit_sha: sha });
const commit = (sha: string, parents: string[], message = 'Direct commit') => ({ data: {
    sha, parents: parents.map(sha => ({ sha })), commit: { message }
} });

beforeEach(() => {
    fake = aFakeOctokit();
    logger = new RecordingLogger();
    compare = sinon.stub().resolves({ data: { status: 'diverged' } });
    fake.octokit.repos.compareCommitsWithBasehead = compare;
    collector = new PendingPullRequests(fake.octokit,
        { ...someReleases(), getLatestReleaseCommit: async () => 'lower' }, anActionContext(), logger);
    fake.getCommit.withArgs(sinon.match({ ref: 'merge-2' })).resolves(commit('merge-2', ['merge-1', 'feature'], 'Merge pull request #2 from feature'));
    fake.getCommit.withArgs(sinon.match({ ref: 'merge-1' })).resolves(commit('merge-1', ['lower', 'feature'], 'Merge pull request #1 from feature'));
    fake.pullsGet.withArgs(sinon.match({ pull_number: 1 })).resolves({ data: merged(1) });
    fake.pullsGet.withArgs(sinon.match({ pull_number: 2 })).resolves({ data: merged(2) });
});

describe('when collecting first-parent merges since the stable tag', () => {
    beforeEach(async () => { result = await collector.get('merge-2'); });
    it('should include the range in oldest-first order, excluding the lower bound and side parents', () => {
        result.pullRequests.map(pullRequest => pullRequest.number).should.deep.equal([1, 2]);
        result.fallback.should.be.false;
        fake.getCommit.callCount.should.equal(2);
        compare.called.should.be.false;
    });
});

describe('when the upper bound is already the latest release', () => {
    beforeEach(async () => { result = await collector.get('lower'); });
    it('should report an empty range without traversing history', () => {
        result.pullRequests.should.deep.equal([]);
        fake.getCommit.called.should.be.false;
    });
});

describe('when a squash commit has associated PRs', () => {
    beforeEach(async () => {
        fake.getCommit.resolves(commit('squash', ['lower']));
        fake.setAssociatedPullRequests([merged(3, 'squash'), merged(3, 'squash'), merged(4, 'elsewhere'),
            aPullRequest({ number: 5, merge_commit_sha: 'squash' }),
            { ...merged(6, 'squash'), base: { ref: 'other', sha: 'base' } }]);
        result = await collector.get('squash');
    });
    it('should include only matching merges into the default branch, once', () => {
        result.pullRequests.map(pullRequest => pullRequest.number).should.deep.equal([3]);
    });
});

describe('when the latest release tag is absent from first-parent history', () => {
    beforeEach(async () => {
        fake.getCommit.resolves(commit('root', []));
        result = await collector.get('root');
    });
    it('should warn and fall back rather than aggregate an unbounded range', () => {
        result.fallback.should.be.true;
        logger.messages.join('\n').should.include('falling back to single-PR');
        compare.calledOnceWithExactly({ owner: 'cratis', repo: 'release-action', basehead: 'root...lower' }).should.be.true;
    });
});

describe('when an older event is covered by a later release', () => {
    beforeEach(async () => {
        fake.getCommit.resolves(commit('root', []));
        compare.resolves({ data: { status: 'ahead' } });
        result = await collector.get('root');
    });
    it('should return nothing pending rather than fall back to the old PR', () => {
        result.fallback.should.be.false;
        result.pullRequests.should.deep.equal([]);
    });
});

describe('when the repository has not released yet', () => {
    beforeEach(async () => {
        collector = new PendingPullRequests(fake.octokit,
            { ...someReleases(), getLatestReleaseCommit: async () => undefined }, anActionContext(), logger);
        fake.getCommit.resolves(commit('root', []));
        fake.setAssociatedPullRequests([merged(1, 'root')]);
        result = await collector.get('root');
    });
    it('should collect through the root without a fallback', () => {
        result.pullRequests.map(pullRequest => pullRequest.number).should.deep.equal([1]);
        result.fallback.should.be.false;
    });
});

describe('when a merge message points at an unrelated PR', () => {
    it('should reject the range', async () => {
        fake.pullsGet.resolves({ data: merged(999, 'unrelated') });
        fake.pullsGet.withArgs(sinon.match({ pull_number: 1 })).resolves({ data: merged(999, 'unrelated') });
        let message = '';
        try { await collector.get('merge-1'); } catch (error) { message = String(error); }
        message.should.include('not a matching merge');
    });
});

describe('when release tag lookup is unavailable', () => {
    it('should fail loudly', async () => {
        collector = new PendingPullRequests(fake.octokit, someReleases(), anActionContext(), logger);
        let message = '';
        try { await collector.get('merge-1'); } catch (error) { message = String(error); }
        message.should.include('Release tag lookup is unavailable');
    });
});
