import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { WorkflowsDifferFromDefaultBranch } from '../../WorkflowsDifferFromDefaultBranch';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// A missing directory on one side counts as different.
describe('when creating a release that is forbidden and only the commit has workflows', () => {
    const rejection = { status: 403, message: 'Resource not accessible by integration' };
    const commit = 'abcabcabcabcabcabcabcabcabcabcabcabcabca';
    const inDirectory = (sha: string) => ({ data: [{ name: 'workflows', type: 'dir', sha }, { name: 'CODEOWNERS', type: 'file', sha: 'f' }] });
    let thrown: unknown;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.createRelease.rejects(rejection);
        fake.getContent.callsFake((args: { ref: string }) =>
            args.ref === commit ? Promise.resolve(inDirectory('one')) : Promise.reject({ status: 404 }));

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());

        try {
            await releases.create({
                tag: 'v1.2.4',
                name: 'Release v1.2.4',
                notes: 'The notes',
                generateNotes: false,
                isPrerelease: false,
                targetCommitish: commit
            });
        } catch (ex) {
            thrown = ex;
        }
    });

    it('should fail with the explanation', () => {
        (thrown as WorkflowsDifferFromDefaultBranch).should.be.instanceOf(WorkflowsDifferFromDefaultBranch);
    });
});
