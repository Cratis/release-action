import { SemVer } from 'semver';
import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// The latest release is the highest published, non-draft, non-prerelease version - regardless of the order
// the API returns them in, whether they carry a `v` prefix, and ignoring drafts and prereleases entirely.
describe('when getting the latest release version from a mix of releases', () => {
    let fake: FakeOctokit;
    let result: SemVer;

    beforeEach(async () => {
        fake = aFakeOctokit();
        fake.setReleases([
            { tag_name: 'v1.2.0', target_commitish: 'main', draft: false, prerelease: false },
            { tag_name: '2.0.0-beta.1', target_commitish: 'main', draft: false, prerelease: true },
            { tag_name: 'v1.4.0', target_commitish: 'main', draft: false, prerelease: false },
            { tag_name: 'v1.5.0', target_commitish: 'main', draft: true, prerelease: false },
            { tag_name: '1.3.0', target_commitish: 'main', draft: false, prerelease: false }
        ]);

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());
        result = await releases.getLatestReleaseVersion();
    });

    it('should pick the highest published release version', () => {
        result.version.should.equal('1.4.0');
    });
});
