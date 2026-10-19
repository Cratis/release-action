import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { WorkflowsDifferFromDefaultBranch } from '../../WorkflowsDifferFromDefaultBranch';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// The token cannot tag a commit whose workflows differ from the default branch head, so GitHub answers 403.
describe('when creating a release that is forbidden because the workflows differ from the default branch', () => {
    const rejection = { status: 403, message: 'Resource not accessible by integration' };
    const commit = 'abcabcabcabcabcabcabcabcabcabcabcabcabca';
    const inDirectory = (sha: string) => ({ data: [{ name: 'workflows', type: 'dir', sha }, { name: 'CODEOWNERS', type: 'file', sha: 'f' }] });
    let thrown: unknown;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.createRelease.rejects(rejection);
        fake.getContent.callsFake((args: { ref: string }) => Promise.resolve(inDirectory(args.ref === commit ? 'one' : 'two')));

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

    it('should name the cause', () => {
        (thrown as Error).message.should.contain("differ from 'main'");
    });

    it('should name the recovery', () => {
        (thrown as Error).message.should.contain("Publish workflow with 'workflow_dispatch'");
    });

    it('should say not to re-run', () => {
        (thrown as Error).message.should.contain('Do not re-run');
    });

    it('should include the original error', () => {
        (thrown as Error).message.should.contain('Resource not accessible by integration');
    });
});
