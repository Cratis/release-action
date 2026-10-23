// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { beforeEach, describe, it, vi, afterEach } from 'vitest';

import { a_batched_main_step } from '../../given/a_batched_main_step';
import { HandleVersion } from '../../../HandleVersion';
import { anActionContext } from '../../../specs/anActionContext';

let context: a_batched_main_step;
beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
    context = new a_batched_main_step();
});
afterEach(() => vi.useRealTimers());

describe('when nothing is pending', () => {
    beforeEach(async () => context.run());
    it('should skip with nothing-pending and record an empty set', () => {
        context.result.reason.should.equal('nothing-pending');
        context.result.shouldPublish.should.be.false;
        context.result.should.have.property('pullRequests').that.deep.equal([]);
        context.record.calledOnceWithExactly(context.result).should.be.true;
    });
});

describe('when the release window has not elapsed', () => {
    beforeEach(async () => context.run([context.merged(1), context.merged(2)]));
    it('should retain all pending changes without calculating a version', () => {
        context.result.reason.should.equal('batched');
        context.result.shouldPublish.should.be.false;
        context.result.should.have.property('pullRequests').that.deep.equal([1, 2]);
        context.releases.getLatestReleaseVersion.called.should.be.false;
    });
});

describe('when the oldest merge reaches the window', () => {
    beforeEach(async () => context.run([context.merged(1, ['patch'], 60), context.merged(2, ['minor'], 1)]));
    it('should release the highest intent with every whole issue reference', () => {
        context.result.reason.should.equal('release');
        context.result.shouldPublish.should.be.true;
        context.result.shouldCreateRelease.should.be.true;
        context.result.version.should.equal('1.3.0');
        context.result.previousVersion.should.equal('1.2.3');
        context.result.tag.should.equal('v1.3.0');
        context.result.releaseNotes.should.equal('## Fixed\n\n- Change 1. (#1)\n\n- Change 2. (#2)');
        context.result.targetCommitish.should.equal('upper');
        context.releases.existsForSha.calledOnceWithExactly('upper').should.be.true;
    });
});

describe('when a hotfix bypasses the window', () => {
    beforeEach(async () => context.run([context.merged(1, ['minor']), context.merged(2, ['patch', 'hotfix'])]));
    it('should release the whole batch immediately', () => {
        context.result.version.should.equal('1.3.0');
        context.result.should.have.property('pullRequests').that.deep.equal([1, 2]);
    });
});

describe('when a hotfix merge would include a major change', () => {
    beforeEach(async () => {
        context.context = { ...context.context, eventName: 'push' };
        await context.run([context.merged(1, ['major'], 100), context.merged(2, ['patch', 'hotfix'])]);
    });
    it('should reject publication and tell the main step to fail with the major PR and recovery', () => {
        context.result.reason.should.equal('error');
        context.result.shouldPublish.should.be.false;
        context.result.shouldCreateRelease.should.be.false;
        context.result.should.have.property('failureMessage').that.equal('A major change is pending (#1); hotfix releases cannot include it. Run Publish manually (workflow_dispatch) to release it.');
        context.logger.messages.should.include(context.result.failureMessage);
        context.releases.getLatestReleaseVersion.called.should.be.false;
    });
});

describe('when scheduled ticks find a hotfix that would include a major change', () => {
    const results: unknown[] = [];
    beforeEach(async () => {
        results.length = 0;
        for (let tick = 0; tick < 3; tick++) {
            await context.run([context.merged(1, ['major'], 100), context.merged(2, ['patch', 'hotfix'])]);
            results.push(context.result);
        }
    });
    it('should keep the batch pending on every tick without failing the job', () => {
        for (const result of results as Array<Record<string, unknown>>) {
            result.should.have.property('reason').that.equal('batched');
            result.should.have.property('shouldPublish').that.equal(false);
            result.should.not.have.property('failureMessage');
            result.should.have.property('pullRequests').that.deep.equal([1, 2]);
        }
        context.logger.messages.should.include('A major change is pending (#1); hotfix releases cannot include it. Run Publish manually (workflow_dispatch) to release it.');
        context.releases.getLatestReleaseVersion.called.should.be.false;
    });
});

for (const version of ['', '0.0.0']) {
    describe(`when manually releasing a pending major with version '${version}'`, () => {
        beforeEach(async () => {
            context.context = { ...context.context, eventName: 'workflow_dispatch' };
            context.inputs = { ...context.inputs, version };
            await context.run([context.merged(1, ['major']), context.merged(2, ['patch', 'hotfix'])]);
        });
        it('should bypass the wait and the hotfix-major guard', () => {
            context.result.version.should.equal('2.0.0');
            context.result.should.have.property('pullRequests').that.deep.equal([1, 2]);
            (context.result.failureMessage === undefined).should.be.true;
        });
    });
}

describe('when all pending changes have been reverted', () => {
    beforeEach(async () => context.run([context.merged(1), { ...context.merged(2), body: 'Reverts cratis/release-action#1' }]));
    it('should report nothing-pending', () => context.result.reason.should.equal('nothing-pending'));
});

describe('when pending PRs have no release intent', () => {
    beforeEach(async () => context.run([context.merged(1, [], 120)]));
    it('should retain them with no-label', () => {
        context.result.reason.should.equal('no-label');
        context.result.should.have.property('pullRequests').that.deep.equal([1]);
    });
});

describe('when a pending PR carries more than one intent', () => {
    beforeEach(async () => context.run([context.merged(1, ['patch', 'no-release'], 120)]));
    it('should fail closed with error', () => {
        context.result.reason.should.equal('error');
        context.logger.messages.join('\n').should.include('more than one release intent');
    });
});

describe('when the batch target already has a release', () => {
    beforeEach(async () => {
        context.releases.existsForSha.resolves(true);
        await context.run([context.merged(1, ['patch'], 120)]);
    });
    it('should never publish a second version', () => context.result.reason.should.equal('already-released'));
});

describe('when a PR event has an ephemeral context SHA', () => {
    beforeEach(async () => {
        const pullRequest = context.merged(1, ['patch'], 120);
        context.context = anActionContext(pullRequest, 'test-merge');
        await context.run([pullRequest]);
    });
    it('should collect and release through the real merge SHA', () => {
        context.pending.get.calledOnceWithExactly('merge-1').should.be.true;
        context.result.targetCommitish.should.equal('merge-1');
    });
});

describe('when the tag is not on first-parent history', () => {
    beforeEach(async () => {
        context.pending.get.resolves({ pullRequests: [], fallback: true });
        const pullRequest = context.merged(1);
        context.pullRequests.getMergedPullRequest = async () => pullRequest;
        context.result = await context.handler().run();
    });
    it('should retain the single-PR fallback body and decision', () => {
        context.result.version.should.equal('1.2.4');
        context.result.releaseNotes.should.equal('## Fixed\n\n- Change 1. (#1)');
        (context.result.pullRequests === undefined).should.be.true;
    });
});

describe('when batching is enabled on an unmerged PR', () => {
    beforeEach(async () => {
        const pullRequest = { ...context.merged(1), merged: false, merged_at: null };
        context.context = anActionContext(pullRequest);
        context.pullRequests.getCurrentPullRequest = async () => pullRequest;
        context.result = await context.handler().run();
    });
    it('should preserve the existing non-release path without examining pending changes', () => {
        context.result.reason.should.equal('not-merged');
        context.pending.get.called.should.be.false;
    });
});

describe('when a real version overrides batching', () => {
    beforeEach(async () => {
        context.inputs = { ...context.inputs, version: '3.2.1' };
        context.result = await context.handler().run();
    });
    it('should preserve the explicit version path', () => {
        context.result.version.should.equal('3.2.1');
        context.pending.get.called.should.be.false;
    });
});

describe('when pending merge dates are invalid', () => {
    beforeEach(async () => context.run([{ ...context.merged(1), merged_at: null }]));
    it('should fail closed rather than wait indefinitely', () => context.result.reason.should.equal('error'));
});

describe('when no pending collector has been wired', () => {
    beforeEach(async () => {
        context.result = await new HandleVersion(context.pullRequests,
            { getNextVersionFor: async () => { throw new Error('Unexpected single-PR selection'); } },
            context.decisions, context.inputs, context.context, context.logger).run();
    });
    it('should fail closed', () => context.result.reason.should.equal('error'));
});
