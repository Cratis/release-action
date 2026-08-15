import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'vitest';

import { setOutputsFrom } from '../outputs';
import { aDecisionToRelease } from '../for_HandleRelease/given/a_recorded_decision';

// `setOutput` appends to `$GITHUB_OUTPUT` - point it at a throwaway file and read back what was written.
describe('when setting the outputs', () => {
    let previous: string | undefined;
    let written: string;

    beforeEach(() => {
        previous = process.env.GITHUB_OUTPUT;
        const path = join(mkdtempSync(join(tmpdir(), 'release-action-')), 'output');
        writeFileSync(path, '');
        process.env.GITHUB_OUTPUT = path;

        setOutputsFrom(aDecisionToRelease());
        written = readFileSync(path, 'utf8');
    });

    afterEach(() => {
        if (previous === undefined) delete process.env.GITHUB_OUTPUT;
        else process.env.GITHUB_OUTPUT = previous;
    });

    it('should write the version', () => {
        written.should.contain('version');
        written.should.contain('1.2.4');
    });

    it('should write the tag', () => {
        written.should.contain('v1.2.4');
    });

    it('should write the previous version', () => {
        written.should.contain('previous-version');
    });

    it('should write the reason', () => {
        written.should.contain('reason');
        written.should.contain('release');
    });
});
