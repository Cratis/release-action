import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, it } from 'vitest';

import { RecordingLogger } from '../../specs/RecordingLogger';
import { writeSummary } from '../../summary';
import { aDecisionToRelease } from '../../for_HandleRelease/given/a_recorded_decision';

// `core.summary` caches its file path on first write, so a single stable path is used for the whole suite and
// truncated before each test.
const summaryFile = join(mkdtempSync(join(tmpdir(), 'release-action-')), 'summary');
const previous = process.env.GITHUB_STEP_SUMMARY;

describe('when writing the summary to a summary sink', () => {
    let written: string;

    beforeEach(async () => {
        writeFileSync(summaryFile, '');
        process.env.GITHUB_STEP_SUMMARY = summaryFile;

        await writeSummary(aDecisionToRelease(), new RecordingLogger());
        written = readFileSync(summaryFile, 'utf8');
    });

    afterAll(() => {
        if (previous === undefined) delete process.env.GITHUB_STEP_SUMMARY;
        else process.env.GITHUB_STEP_SUMMARY = previous;
    });

    it('should write the heading', () => {
        written.should.contain('Release');
    });

    it('should write the version into the table', () => {
        written.should.contain('1.2.4');
    });
});
