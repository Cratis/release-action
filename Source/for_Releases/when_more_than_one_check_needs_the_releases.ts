import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../Releases';
import { RecordingLogger } from '../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../specs/aFakeOctokit';
import { anActionContext } from '../specs/anActionContext';

// Working out the version and checking whether the commit was already released both need the full list of
// releases, and listing them pages through every release the repository has ever had. Asking twice doubles
// that for no reason, so the first answer is held for the lifetime of the run.
describe('when more than one check needs the releases', () => {
    const sha = 'abcabcabcabcabcabcabcabcabcabcabcabcabca';
    let fake: FakeOctokit;

    beforeEach(async () => {
        fake = aFakeOctokit();
        fake.setReleases([
            { tag_name: 'v1.2.3', target_commitish: sha, draft: false, prerelease: false }
        ]);

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());

        await releases.getLatestReleaseVersion();
        await releases.existsForSha(sha);
    });

    it('should list the releases only once', () => {
        fake.paginate.callCount.should.equal(1);
    });
});
