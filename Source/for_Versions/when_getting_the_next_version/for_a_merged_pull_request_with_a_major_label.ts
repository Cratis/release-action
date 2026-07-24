import { beforeEach, describe, it } from 'vitest';

import { VersionInfo } from '../../VersionInfo';
import { Versions } from '../../Versions';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { someReleases } from '../../specs/someReleases';

describe('when getting the next version for a merged pull request carrying both a major and a patch label', () => {
    let result: VersionInfo;

    beforeEach(async () => {
        const versions = new Versions(someReleases(), new RecordingLogger());

        result = await versions.getNextVersionFor(aPullRequest({
            state: 'closed',
            merged: true,
            merged_at: '2026-07-23T10:00:00Z',
            labels: [{ name: 'patch' }, { name: 'major' }]
        }));
    });

    it('should let the most significant label win', () => {
        result.version?.version.should.equal('2.0.0');
    });
});
