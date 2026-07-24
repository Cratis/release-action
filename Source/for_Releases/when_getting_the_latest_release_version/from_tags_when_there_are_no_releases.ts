import { SemVer } from 'semver';
import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// Bootstrapping: a repository can carry a floating `v1` alias (and other version tags) before it has ever cut
// a GitHub release. The next version is based on the highest such tag rather than restarting from 0.0.0.
describe('when getting the latest release version from tags when there are no releases', () => {
    let result: SemVer;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.setReleases([]);
        fake.setTags([
            { name: 'v1' },
            { name: 'v0.9.0' },
            { name: 'not-a-version' }
        ]);

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());
        result = await releases.getLatestReleaseVersion();
    });

    it('should coerce the highest version tag', () => {
        result.version.should.equal('1.0.0');
    });
});
