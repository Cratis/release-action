import { beforeEach, describe, it } from 'vitest';

import { VersionInfo } from '../../VersionInfo';
import { Versions } from '../../Versions';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest, headSha } from '../../specs/aPullRequest';
import { someReleases } from '../../specs/someReleases';

describe('when getting the next version for a pull request from a branch named after a version', () => {
    let result: VersionInfo;

    beforeEach(async () => {
        const versions = new Versions(someReleases(), new RecordingLogger());

        result = await versions.getNextVersionFor(aPullRequest({
            state: 'open',
            draft: true,
            head: { ref: '3.1.0', sha: headSha }
        }));
    });

    it('should base the version on the branch rather than on the latest release', () => {
        result.version?.version.should.equal('3.1.0-pr42.1234567');
    });

    it('should be isolated for the pull request', () => {
        result.isIsolatedForPullRequest.should.be.true;
    });
});
