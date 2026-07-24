import { afterEach, beforeEach, describe, it } from 'vitest';

import { nothingToRelease } from '../../ReleaseDecision';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { writeSummary } from '../../summary';

// Not every runner provides a step-summary file. Writing the summary must be best-effort and never fail the
// action when there is nowhere to write it.
describe('when writing the summary without a summary sink', () => {
    let previous: string | undefined;
    let thrown: unknown;

    beforeEach(async () => {
        previous = process.env.GITHUB_STEP_SUMMARY;
        delete process.env.GITHUB_STEP_SUMMARY;

        try {
            await writeSummary(nothingToRelease, new RecordingLogger());
        } catch (ex) {
            thrown = ex;
        }
    });

    afterEach(() => {
        if (previous === undefined) delete process.env.GITHUB_STEP_SUMMARY;
        else process.env.GITHUB_STEP_SUMMARY = previous;
    });

    it('should not fail', () => {
        (thrown === undefined).should.be.true;
    });
});
