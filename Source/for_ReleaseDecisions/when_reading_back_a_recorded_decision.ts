import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'vitest';

import { ReleaseDecision } from '../ReleaseDecision';
import { ReleaseDecisions } from '../ReleaseDecisions';

// The main step and the post step run as separate processes, so the decision travels between them as a string
// through the environment. This proves it survives the round trip unchanged.
describe('when reading back a recorded decision', () => {
    const environmentVariable = 'CRATIS_RELEASE_ACTION_DECISION';
    let recorded: ReleaseDecision;
    let read: ReleaseDecision | undefined;
    let previousGitHubEnv: string | undefined;

    beforeEach(() => {
        delete process.env[environmentVariable];

        // `exportVariable` writes to `$GITHUB_ENV` when it is set, and otherwise emits a workflow command to
        // stdout - point it at a throwaway file so the spec stays quiet either way.
        previousGitHubEnv = process.env.GITHUB_ENV;
        const gitHubEnv = join(mkdtempSync(join(tmpdir(), 'release-action-')), 'env');
        writeFileSync(gitHubEnv, '');
        process.env.GITHUB_ENV = gitHubEnv;

        recorded = {
            shouldPublish: true,
            shouldCreateRelease: true,
            version: '1.2.4',
            tag: 'v1.2.4',
            isPrerelease: false,
            isIsolatedForPullRequest: false,
            releaseNotes: 'Notes with "quotes" and\nnewlines',
            previousVersion: '1.2.3',
            targetCommitish: 'abcabcabcabcabcabcabcabcabcabcabcabcabca'
        };

        const decisions = new ReleaseDecisions();

        // `record` sets `process.env` immediately (as well as writing `$GITHUB_ENV` for later steps), which is
        // what the read below picks up.
        decisions.record(recorded);
        read = decisions.read();
    });

    afterEach(() => {
        delete process.env[environmentVariable];
        if (previousGitHubEnv === undefined) delete process.env.GITHUB_ENV;
        else process.env.GITHUB_ENV = previousGitHubEnv;
    });

    it('should read back an equal decision', () => {
        read?.should.deep.equal(recorded);
    });
});
