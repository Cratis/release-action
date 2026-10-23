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
    compare = sinon.stub().resolves({ data: { status: 'ahead', ahead_by: 2 } });
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
        compare.calledOnceWithExactly({ owner: 'cratis', repo: 'release-action', basehead: 'lower...merge-2' }).should.be.true;
        sinon.assert.callOrder(compare, fake.getCommit);
    });
});

describe('when the upper bound is already the latest release', () => {
    beforeEach(async () => {
        compare.resolves({ data: { status: 'identical', ahead_by: 0 } });
        result = await collector.get('lower');
    });
    it('should report an empty range without traversing history', () => {
        result.pullRequests.should.deep.equal([]);
        result.fallback.should.be.false;
        fake.getCommit.called.should.be.false;
        compare.calledOnceWithExactly({ owner: 'cratis', repo: 'release-action', basehead: 'lower...lower' }).should.be.true;
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
        compare.calledOnceWithExactly({ owner: 'cratis', repo: 'release-action', basehead: 'lower...root' }).should.be.true;
        fake.getCommit.callCount.should.equal(1);
    });
});

describe('when an older event is covered by a later release', () => {
    beforeEach(async () => {
        fake.getCommit.resolves(commit('root', []));
        compare.resolves({ data: { status: 'behind', ahead_by: 0 } });
        result = await collector.get('root');
    });
    it('should return nothing pending rather than fall back to the old PR', () => {
        result.fallback.should.be.false;
        result.pullRequests.should.deep.equal([]);
        fake.getCommit.called.should.be.false;
        compare.calledOnceWithExactly({ owner: 'cratis', repo: 'release-action', basehead: 'lower...root' }).should.be.true;
    });
});

describe('when the release tag is on a side parent', () => {
    beforeEach(async () => {
        fake.getCommit.resolves(commit('ancestor', ['older']));
        fake.getCommit.withArgs(sinon.match({ ref: 'upper' })).resolves(commit('upper', ['ancestor', 'lower']));
        result = await collector.get('upper');
    });
    it('should stop at ahead_by commits and fall back without collecting PRs', () => {
        result.should.deep.equal({ pullRequests: [], fallback: true });
        fake.getCommit.callCount.should.equal(2);
        fake.getCommit.callCount.should.be.at.most(2);
        fake.getRepository.called.should.be.false;
        logger.messages.join('\n').should.include('not on the first-parent history; falling back to single-PR');
    });
});

describe('when the target and release tag have diverged', () => {
    it('should warn and fall back without traversing history', async () => {
        compare.resolves({ data: { status: 'diverged', ahead_by: 1000 } });
        result = await collector.get('upper');
        result.should.deep.equal({ pullRequests: [], fallback: true });
        fake.getCommit.called.should.be.false;
        compare.calledOnceWithExactly({ owner: 'cratis', repo: 'release-action', basehead: 'lower...upper' }).should.be.true;
        logger.messages.join('\n').should.include('not on the first-parent history; falling back to single-PR');
    });
});

describe('when the repository has not released yet', () => {
    beforeEach(() => {
        collector = new PendingPullRequests(fake.octokit,
            { ...someReleases(), getLatestReleaseCommit: async () => undefined }, anActionContext(), logger);
        fake.getCommit.resolves(commit('root', []));
        fake.setAssociatedPullRequests([merged(1, 'root')]);
    });
    it('should collect through the root without a fallback', async () => {
        result = await collector.get('root');
        result.pullRequests.map(pullRequest => pullRequest.number).should.deep.equal([1]);
        result.fallback.should.be.false;
        compare.called.should.be.false;
    });
    for (const count of [250, 251]) {
        it(`should ${count === 250 ? 'include' : 'fall back on'} a history of ${count} commits within the 250-call cap`, async () => {
            fake.getCommit.callsFake(({ ref }: { ref: string }) => {
                const index = Number(ref.replace('commit-', ''));
                return Promise.resolve(commit(ref, index ? [`commit-${index - 1}`] : []));
            });
            result = await collector.get(`commit-${count - 1}`);
            result.fallback.should.equal(count > 250);
            fake.getCommit.callCount.should.equal(250);
            compare.called.should.be.false;
            if (count > 250) logger.messages.join('\n').should.include('250-commit limit; falling back to single-PR');
        });
    }
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
