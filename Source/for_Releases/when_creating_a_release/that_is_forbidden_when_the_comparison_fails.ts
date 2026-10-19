import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// A failing comparison must not hide the refusal it was meant to explain.
describe('when creating a release that is forbidden and the workflows cannot be compared', () => {
    const rejection = { status: 403, message: 'Resource not accessible by integration' };
    const commit = 'abcabcabcabcabcabcabcabcabcabcabcabcabca';
    let thrown: unknown;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.createRelease.rejects(rejection);
        fake.getContent.rejects({ status: 500, message: 'Server error' });

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
});
