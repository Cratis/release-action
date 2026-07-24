import { beforeEach, describe, it } from 'vitest';

import { IReleaseOptions } from '../../IReleaseOptions';
import { VersionInfo } from '../../VersionInfo';
import { Versions } from '../../Versions';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { someReleases } from '../../specs/someReleases';

// A repository can name its labels however it likes - here `bug` means a patch.
describe('when getting the next version for a merged pull request with custom release labels', () => {
    let result: VersionInfo;

    beforeEach(async () => {
        const options: IReleaseOptions = {
            tagPrefix: 'v',
            majorLabels: ['breaking'],
            minorLabels: ['feature'],
            patchLabels: ['bug']
        };
        const versions = new Versions(someReleases(), new RecordingLogger(), options);

        result = await versions.getNextVersionFor(aPullRequest({
            state: 'closed',
            merged: true,
            merged_at: '2026-07-23T10:00:00Z',
            labels: [{ name: 'bug' }]
        }));
    });

    it('should treat the custom label as a patch bump', () => {
        result.version?.version.should.equal('1.2.4');
    });
});
