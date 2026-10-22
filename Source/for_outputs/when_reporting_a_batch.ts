// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { describe, it, vi } from 'vitest';
import { setOutput } from '@actions/core';

import { nothingToRelease } from '../ReleaseDecision';
import { setOutputsFrom } from '../outputs';
import { summaryRowsFor } from '../summary';

vi.mock('@actions/core', async importOriginal => ({
    ...await importOriginal<typeof import('@actions/core')>(), setOutput: vi.fn()
}));

describe('when reporting a batch', () => {
    it('should expose all included PR numbers as CSV and in the summary', () => {
        const decision = { ...nothingToRelease('batched'), pullRequests: [12, 34] };
        vi.mocked(setOutput).mockClear();
        setOutputsFrom(decision);
        vi.mocked(setOutput).mock.calls.should.deep.include(['pull-requests', '12,34']);
        summaryRowsFor(decision).should.deep.include(['Pull requests', '#12, #34']);
    });
    it('should expose an empty CSV and a readable summary when nothing is pending', () => {
        const decision = { ...nothingToRelease('nothing-pending'), pullRequests: [] };
        vi.mocked(setOutput).mockClear();
        setOutputsFrom(decision);
        vi.mocked(setOutput).mock.calls.should.deep.include(['pull-requests', '']);
        summaryRowsFor(decision).should.deep.include(['Pull requests', '—']);
    });
    it('should leave single-PR outputs and summary unchanged', () => {
        vi.mocked(setOutput).mockClear();
        setOutputsFrom(nothingToRelease('no-label'));
        vi.mocked(setOutput).mock.calls.map(call => call[0]).should.not.include('pull-requests');
        summaryRowsFor(nothingToRelease('no-label')).map(row => row[0]).should.not.include('Pull requests');
    });
});
