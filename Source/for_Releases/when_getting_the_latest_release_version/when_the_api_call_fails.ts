import { SemVer } from 'semver';
import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// The very first run of the action on a repository has no releases API access or an empty repository - it must
// still yield a usable starting point rather than throwing.
describe('when getting the latest release version and the api call fails', () => {
    let result: SemVer;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.paginate.rejects(new Error('nope'));

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());
        result = await releases.getLatestReleaseVersion();
    });

    it('should default to 0.0.0', () => {
        result.version.should.equal('0.0.0');
    });
});
