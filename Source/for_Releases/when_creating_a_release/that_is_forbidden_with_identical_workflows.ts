import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { WorkflowsDifferFromDefaultBranch } from '../../WorkflowsDifferFromDefaultBranch';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// The workflows do not explain the refusal, so the original error stands.
describe('when creating a release that is forbidden with identical workflows', () => {
    const rejection = { status: 403, message: 'Resource not accessible by integration' };
    const commit = 'abcabcabcabcabcabcabcabcabcabcabcabcabca';
    const inDirectory = (sha: string) => ({ data: [{ name: 'workflows', type: 'dir', sha }, { name: 'CODEOWNERS', type: 'file', sha: 'f' }] });
    let thrown: unknown;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.createRelease.rejects(rejection);
        fake.getContent.resolves(inDirectory('same'));

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

    it('should propagate the original error', () => {
        (thrown as { message: string }).message.should.equal('Resource not accessible by integration');
    });

    it('should not claim the workflows differ', () => {
        (thrown instanceof WorkflowsDifferFromDefaultBranch).should.be.false;
    });
});
