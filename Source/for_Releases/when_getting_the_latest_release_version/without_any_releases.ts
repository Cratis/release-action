import { SemVer } from 'semver';
import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

describe('when getting the latest release version without any releases', () => {
    let result: SemVer;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.paginate.resolves([]);

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());
        result = await releases.getLatestReleaseVersion();
    });

    it('should default to 0.0.0', () => {
        result.version.should.equal('0.0.0');
    });
});
