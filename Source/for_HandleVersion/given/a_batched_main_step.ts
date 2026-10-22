// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import sinon from 'sinon';

import { HandleVersion } from '../../HandleVersion';
import { IActionContext } from '../../IActionContext';
import { IInputs } from '../../IInputs';
import { IPullRequests } from '../../IPullRequests';
import { PullRequest } from '../../PullRequest';
import { ReleaseDecision } from '../../ReleaseDecision';
import { Versions } from '../../Versions';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { anActionContext } from '../../specs/anActionContext';
import { someReleases } from '../../specs/someReleases';
import { noInputs } from './the_main_step';

export class a_batched_main_step {
    readonly logger = new RecordingLogger();
    readonly releases = someReleases();
    readonly pending = { get: sinon.stub().resolves({ pullRequests: [], fallback: false }) };
    readonly pullRequests: IPullRequests = {
        getMergedPullRequest: sinon.stub().resolves(undefined),
        getCurrentPullRequest: sinon.stub().resolves(undefined)
    };
    readonly record = sinon.stub();
    readonly decisions = { record: this.record, read: () => undefined };
    context: IActionContext = { ...anActionContext(), eventName: 'schedule', payload: {}, sha: 'upper' };
    inputs: IInputs = { ...noInputs, releaseWindow: 60, hotfixLabels: ['hotfix'] };
    result!: ReleaseDecision;

    merged(number: number, labels: string[] = ['patch'], age = 10): PullRequest {
        return aPullRequest({ number, merged: true, state: 'closed', merge_commit_sha: `merge-${number}`,
            merged_at: new Date(Date.now() - age * 60_000).toISOString(),
            labels: labels.map(name => ({ name })), body: `## Fixed\n\n- Change ${number}. (#${number})` });
    }

    async run(pullRequests: PullRequest[] = []): Promise<void> {
        this.pending.get.resolves({ pullRequests, fallback: false });
        this.result = await this.handler().run();
    }

    handler(): HandleVersion {
        return new HandleVersion(this.pullRequests, new Versions(this.releases, this.logger, this.inputs),
            this.decisions, this.inputs, this.context, this.logger, this.pending);
    }
}
