import { beforeEach, describe, it } from 'vitest';

import { IReleaseOptions } from '../../IReleaseOptions';
import { VersionInfo } from '../../VersionInfo';
import { Versions } from '../../Versions';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { someReleases } from '../../specs/someReleases';

// A repository can name its no-release label however it likes - here `skip-release` means the same as
// `no-release` does by default.
describe('when getting the next version for a merged pull request with a custom no-release label', () => {
    let result: VersionInfo;

    beforeEach(async () => {
        const options: IReleaseOptions = {
            tagPrefix: 'v',
            majorLabels: ['major'],
            minorLabels: ['minor'],
            patchLabels: ['patch'],
            noReleaseLabels: ['skip-release']
        };
        const versions = new Versions(someReleases(), new RecordingLogger(), options);

        result = await versions.getNextVersionFor(aPullRequest({
            state: 'closed',
            merged: true,
            merged_at: '2026-07-23T10:00:00Z',
            labels: [{ name: 'skip-release' }]
        }));
    });

    it('should give the no-release reason', () => {
        result.reason?.should.equal('no-release');
    });
});
