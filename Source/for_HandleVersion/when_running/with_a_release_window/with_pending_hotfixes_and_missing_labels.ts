// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { afterEach, beforeEach, describe, it, vi } from 'vitest';

import { a_batched_main_step } from '../../given/a_batched_main_step';
import { anActionContext } from '../../../specs/anActionContext';

let context: a_batched_main_step;
beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
    context = new a_batched_main_step();
});
afterEach(() => vi.useRealTimers());

const guardMessage = 'A major change is pending (#1); hotfix releases cannot include it. Run Publish manually (workflow_dispatch) to release it.';

for (const trigger of ['hotfix PR', 'hotfix push']) {
    describe(`with a major pending on the ${trigger} merge event`, () => {
        beforeEach(async () => {
            const hotfix = context.merged(2, ['patch', 'hotfix']);
            context.context = trigger === 'hotfix PR' ? anActionContext(hotfix, 'ephemeral')
                : { ...context.context, eventName: 'push', sha: 'merge-2' };
            vi.spyOn(context.logger, 'error');
            await context.run([context.merged(1, ['major']), hotfix]);
        });
        it('should fail the triggering hotfix run with the recovery message', () => {
            context.result.reason.should.equal('error');
            context.result.should.have.property('failureMessage').that.equal(guardMessage);
            context.result.shouldPublish.should.be.false;
            vi.mocked(context.logger.error).mock.calls.should.deep.equal([[guardMessage]]);
        });
    });
}

for (const trigger of ['unrelated push', 'major push', 'unrelated PR', 'schedule', 'other event']) {
    describe(`with a hotfix and major pending on an ${trigger}`, () => {
        beforeEach(async () => {
            const unrelated = context.merged(3);
            context.context = trigger === 'unrelated PR' ? anActionContext(unrelated, 'merge-2') : {
                ...context.context,
                eventName: trigger === 'schedule' ? 'schedule' : trigger === 'other event' ? 'repository_dispatch' : 'push',
                sha: trigger === 'major push' ? 'merge-1' : trigger === 'other event' ? 'merge-2' : 'unrelated'
            };
            vi.spyOn(context.logger, 'warn');
            vi.spyOn(context.logger, 'error');
            await context.run([context.merged(1, ['major']), context.merged(2, ['patch', 'hotfix']), unrelated]);
        });
        it('should warn and keep the batch pending without a failure message', () => {
            context.result.reason.should.equal('batched');
            context.result.shouldPublish.should.be.false;
            context.result.should.not.have.property('failureMessage');
            vi.mocked(context.logger.warn).mock.calls.should.deep.equal([[guardMessage]]);
            vi.mocked(context.logger.error).mock.calls.should.deep.equal([]);
        });
    });
}

for (const age of [10, 120]) {
    describe(`with unlabeled PRs in a batch aged ${age} minutes`, () => {
        beforeEach(async () => {
            vi.spyOn(context.logger, 'warn');
            await context.run([context.merged(1, [], age), context.merged(2, ['patch']), context.merged(3, ['documentation'])]);
        });
        it('should warn once for each missing intent without blocking the batch decision', () => {
            context.result.reason.should.equal(age === 10 ? 'batched' : 'release');
            context.result.should.have.property('pullRequests').that.deep.equal([1, 2, 3]);
            vi.mocked(context.logger.warn).mock.calls.should.deep.equal([
                ['PR #1: No release related labels associated with the pull request.'],
                ['PR #3: No release related labels associated with the pull request.']
            ]);
        });
    });
}

describe('with no release intent anywhere in the pending batch', () => {
    beforeEach(async () => {
        vi.spyOn(context.logger, 'warn');
        await context.run([context.merged(1, [], 120)]);
    });
    it('should warn while retaining the no-label decision', () => {
        context.result.reason.should.equal('no-label');
        vi.mocked(context.logger.warn).mock.calls.should.deep.equal([
            ['PR #1: No release related labels associated with the pull request.']
        ]);
    });
});
