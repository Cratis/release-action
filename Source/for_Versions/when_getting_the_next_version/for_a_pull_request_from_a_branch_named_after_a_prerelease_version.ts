import { beforeEach, describe, it } from 'vitest';

import { VersionInfo } from '../../VersionInfo';
import { Versions } from '../../Versions';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest, headSha } from '../../specs/aPullRequest';
import { someReleases } from '../../specs/someReleases';

// A branch named after a prerelease is a shared channel - everything built from it lands on `alpha`, so the
// version is not isolated to this pull request.
describe('when getting the next version for a pull request from a branch named after a prerelease version', () => {
    let result: VersionInfo;

    beforeEach(async () => {
        const versions = new Versions(someReleases(), new RecordingLogger());

        result = await versions.getNextVersionFor(aPullRequest({
            state: 'open',
            draft: true,
            head: { ref: '3.1.0-alpha', sha: headSha }
        }));
    });

    it('should stamp the channel with the head commit', () => {
        result.version?.version.should.equal('3.1.0-alpha.1234567');
    });

    it('should be a prerelease', () => {
        result.isPrerelease.should.be.true;
    });

    it('should not be isolated for the pull request', () => {
        result.isIsolatedForPullRequest.should.be.false;
    });
});
