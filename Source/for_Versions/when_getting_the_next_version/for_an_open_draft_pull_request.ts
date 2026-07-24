import { beforeEach, describe, it } from 'vitest';

import { VersionInfo } from '../../VersionInfo';
import { Versions } from '../../Versions';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { someReleases } from '../../specs/someReleases';

describe('when getting the next version for an open draft pull request', () => {
    let result: VersionInfo;

    beforeEach(async () => {
        const versions = new Versions(someReleases(), new RecordingLogger());

        result = await versions.getNextVersionFor(aPullRequest({
            state: 'open',
            draft: true,
            labels: [{ name: 'patch' }]
        }));
    });

    it('should stamp the version with the pull request and its head commit', () => {
        result.version?.version.should.equal('1.2.3-pr42.1234567');
    });

    it('should be a prerelease', () => {
        result.isPrerelease.should.be.true;
    });

    it('should be isolated for the pull request', () => {
        result.isIsolatedForPullRequest.should.be.true;
    });
});
