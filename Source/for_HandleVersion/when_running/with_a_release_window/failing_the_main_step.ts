// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { describe, it, vi } from 'vitest';
import { setFailed } from '@actions/core';

import { noInputs } from '../../given/the_main_step';
import { aPullRequest } from '../../../specs/aPullRequest';

const state = vi.hoisted(() => ({ inputs: {}, pullRequests: [] as unknown[] }));
vi.mock('../../../inputs', () => ({ inputs: state.inputs }));
vi.mock('../../../PendingPullRequests', () => ({ PendingPullRequests: class {
    async get() { return { pullRequests: state.pullRequests, fallback: false }; }
} }));
vi.mock('@actions/github', () => ({
    context: { eventName: 'push', repo: { owner: 'cratis', repo: 'release-action' }, payload: {}, sha: 'upper' },
    getOctokit: () => ({})
}));
vi.mock('@actions/core', async importOriginal => ({
    ...await importOriginal<typeof import('@actions/core')>(),
    setFailed: vi.fn(), setOutput: vi.fn(), exportVariable: vi.fn()
}));
vi.mock('../../../summary', () => ({ writeSummary: vi.fn() }));

describe('when a hotfix release is blocked by a pending major', () => {
    it('should call core.setFailed with the major PR and the manual recovery', async () => {
        Object.assign(state.inputs, noInputs, { releaseWindow: 60 });
        state.pullRequests = [aPullRequest({ number: 1, labels: [{ name: 'major' }] }),
            aPullRequest({ number: 2, merge_commit_sha: 'upper', labels: [{ name: 'patch' }, { name: 'hotfix' }] })];
        await import('../../../main');
        await vi.waitFor(() => vi.mocked(setFailed).mock.calls.should.deep.equal([[
            'A major change is pending (#1); hotfix releases cannot include it. Run Publish manually (workflow_dispatch) to release it.']]));
    });
});
