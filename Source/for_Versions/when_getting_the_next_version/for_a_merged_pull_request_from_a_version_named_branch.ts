import { beforeEach, describe, it } from 'vitest';

import { VersionInfo } from '../../VersionInfo';
import { Versions } from '../../Versions';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest, headSha } from '../../specs/aPullRequest';
import { someReleases } from '../../specs/someReleases';

// A merged pull request must bump the latest release, never the version its branch happens to be named after -
// bumping a branch-derived prerelease misbehaves (semver.inc does not increment a prerelease like a release,
// so a major bump could produce no change at all).
describe('when getting the next version for a merged pull request from a version-named branch', () => {
    let result: VersionInfo;

    beforeEach(async () => {
        const versions = new Versions(someReleases(), new RecordingLogger());

        result = await versions.getNextVersionFor(aPullRequest({
            state: 'closed',
            merged: true,
            merged_at: '2026-07-23T10:00:00Z',
            head: { ref: '3.1.0', sha: headSha },
            labels: [{ name: 'major' }]
        }));
    });

    it('should bump the latest release rather than the branch version', () => {
        result.version?.version.should.equal('2.0.0');
    });

    it('should not be a prerelease', () => {
        result.isPrerelease.should.be.false;
    });

    it('should not be isolated for the pull request', () => {
        result.isIsolatedForPullRequest.should.be.false;
    });
});
