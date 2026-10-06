import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// A 422 with no release behind the tag was about something else in the request, and nothing was released.
describe('when creating a release that is rejected for another reason', () => {
    const rejection = { status: 422, message: 'Validation Failed' };
    let thrown: unknown;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.createRelease.rejects(rejection);
        fake.getReleaseByTag.rejects({ status: 404 });

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());

        try {
            await releases.create({
                tag: 'v1.2.4',
                name: 'Release v1.2.4',
                notes: 'The notes',
                generateNotes: false,
                isPrerelease: false,
                targetCommitish: 'abcabcabcabcabcabcabcabcabcabcabcabcabca'
            });
        } catch (ex) {
            thrown = ex;
        }
    });

    it('should propagate the rejection', () => {
        (thrown as { message: string }).message.should.equal('Validation Failed');
    });
});
