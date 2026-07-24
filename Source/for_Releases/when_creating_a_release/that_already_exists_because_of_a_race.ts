import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// A concurrent run could create the release between the pre-flight check and this call - GitHub answers 422,
// and the action treats that as an already-satisfied outcome rather than a failure.
describe('when creating a release that already exists because of a race', () => {
    let thrown: unknown;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.createRelease.rejects({ status: 422 });

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

    it('should not fail', () => {
        (thrown === undefined).should.be.true;
    });
});
