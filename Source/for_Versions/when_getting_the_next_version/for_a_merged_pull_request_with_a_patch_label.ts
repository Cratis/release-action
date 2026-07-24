import { beforeEach, describe, it } from 'vitest';

import { VersionInfo } from '../../VersionInfo';
import { Versions } from '../../Versions';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { someReleases } from '../../specs/someReleases';

describe('when getting the next version for a merged pull request with a patch label', () => {
    let result: VersionInfo;

    beforeEach(async () => {
        const versions = new Versions(someReleases(), new RecordingLogger());

        result = await versions.getNextVersionFor(aPullRequest({
            state: 'closed',
            merged: true,
            merged_at: '2026-07-23T10:00:00Z',
            labels: [{ name: 'patch' }]
        }));
    });

    it('should be a release', () => {
        result.isRelease.should.be.true;
    });

    it('should increment the patch of the latest released version', () => {
        result.version?.version.should.equal('1.2.4');
    });

    it('should not be a prerelease', () => {
        result.isPrerelease.should.be.false;
    });

    it('should not be isolated for the pull request', () => {
        result.isIsolatedForPullRequest.should.be.false;
    });
});
