import { beforeEach, describe, it } from 'vitest';

import { VersionInfo } from '../../VersionInfo';
import { Versions } from '../../Versions';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { someReleases } from '../../specs/someReleases';

// This is the regression the action exists to avoid: closing a labeled pull request without merging it used
// to produce a GitHub release, because the closed state was mistaken for a merge.
describe('when getting the next version for a pull request closed without being merged', () => {
    let result: VersionInfo;

    beforeEach(async () => {
        const versions = new Versions(someReleases(), new RecordingLogger());

        result = await versions.getNextVersionFor(aPullRequest({
            state: 'closed',
            merged: false,
            merged_at: null,
            labels: [{ name: 'patch' }]
        }));
    });

    it('should not be a release', () => {
        result.isRelease.should.be.false;
    });

    it('should not be a prerelease either', () => {
        result.isPrerelease.should.be.false;
    });
});
