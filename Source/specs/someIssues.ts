import sinon, { SinonStub } from 'sinon';

import { IIssues } from '../IIssues';

export type StubbedIssues = IIssues & {
    close: SinonStub;
};

/**
 * Builds stubbed issues for a spec, with every close succeeding.
 */
export const someIssues = (): StubbedIssues => ({
    close: sinon.stub().resolves(true)
});
