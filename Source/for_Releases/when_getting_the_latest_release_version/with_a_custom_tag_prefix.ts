import { SemVer } from 'semver';
import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// A repository that tags releases with its own prefix must still have its versions understood.
describe('when getting the latest release version with a custom tag prefix', () => {
    let result: SemVer;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.setReleases([
            { tag_name: 'release-1.2.0', target_commitish: 'main', draft: false, prerelease: false },
            { tag_name: 'release-1.4.0', target_commitish: 'main', draft: false, prerelease: false }
        ]);

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger(), 'release-');
        result = await releases.getLatestReleaseVersion();
    });

    it('should strip the prefix and pick the highest version', () => {
        result.version.should.equal('1.4.0');
    });
});
