import { SemVer } from 'semver';
import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// Once real releases exist they are authoritative - a stray higher tag never overrides them.
describe('when getting the latest release version with both releases and higher tags', () => {
    let result: SemVer;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.setReleases([
            { tag_name: 'v1.2.0', target_commitish: 'main', draft: false, prerelease: false }
        ]);
        fake.setTags([{ name: 'v9.9.9' }]);

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());
        result = await releases.getLatestReleaseVersion();
    });

    it('should use the release version and ignore the tag', () => {
        result.version.should.equal('1.2.0');
    });
});
