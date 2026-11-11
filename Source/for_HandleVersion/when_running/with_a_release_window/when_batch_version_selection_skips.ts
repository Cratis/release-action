// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { beforeEach, describe, it } from 'vitest';
import sinon from 'sinon';

import { a_batched_main_step } from '../../given/a_batched_main_step';
import { HandleVersion } from '../../../HandleVersion';
import { VersionInfo } from '../../../VersionInfo';

let context: a_batched_main_step;
beforeEach(() => {
    context = new a_batched_main_step();
    context.context = { ...context.context, eventName: 'workflow_dispatch' };
    context.pending.get.resolves({ pullRequests: [context.merged(1), context.merged(2, ['minor'])], fallback: false });
});

for (const reason of [undefined, 'no-label', 'already-released'] as const) {
    describe(`when batch version selection returns no version with reason ${reason}`, () => {
        it('should retain the pending numbers and record the exact skip explanation', async () => {
            const nextVersionFor = sinon.stub().resolves({ version: undefined, previousVersion: '1.2.3', reason } as VersionInfo);
            const result = await new HandleVersion(context.pullRequests,
                { getNextVersionFor: sinon.stub(), nextVersionFor }, context.decisions,
                context.inputs, context.context, context.logger, context.pending).run();
            const explanation = reason === 'already-released'
                ? "A release already exists for commit 'upper' - pending PRs #1, #2 will not be released again."
                : 'Pending PRs #1, #2 will not be released (reason: no-label).';
            result.reason.should.equal(reason ?? 'no-label');
            result.shouldPublish.should.be.false;
            result.should.have.property('pullRequests').that.deep.equal([1, 2]);
            result.should.have.property('explanation', explanation);
            context.logger.messages.should.include(explanation);
            context.record.calledOnceWithExactly(result).should.be.true;
            nextVersionFor.calledOnceWithExactly('minor', 'upper').should.be.true;
        });
    });
}
