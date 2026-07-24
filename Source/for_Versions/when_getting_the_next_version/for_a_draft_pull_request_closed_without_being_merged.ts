import { beforeEach, describe, it } from 'vitest';

import { VersionInfo } from '../../VersionInfo';
import { Versions } from '../../Versions';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { someReleases } from '../../specs/someReleases';

// A draft that is abandoned rather than merged must not produce a prerelease either - it contributed nothing.
describe('when getting the next version for a draft pull request closed without being merged', () => {
    let result: VersionInfo;

    beforeEach(async () => {
        const versions = new Versions(someReleases(), new RecordingLogger());

        result = await versions.getNextVersionFor(aPullRequest({
            state: 'closed',
            draft: true,
            merged: false,
            merged_at: null,
            labels: [{ name: 'minor' }]
        }));
    });

    it('should not be a release', () => {
        result.isRelease.should.be.false;
    });
});
