import { beforeEach, describe, it } from 'vitest';

import { VersionInfo } from '../../VersionInfo';
import { Versions } from '../../Versions';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest, testMergeCommitSha } from '../../specs/aPullRequest';
import { StubbedReleases, someReleases } from '../../specs/someReleases';

describe('when getting the next version for a merged pull request that was already released', () => {
    let result: VersionInfo;
    let releases: StubbedReleases;

    beforeEach(async () => {
        releases = someReleases();
        releases.existsForSha.withArgs(testMergeCommitSha).resolves(true);

        const versions = new Versions(releases, new RecordingLogger());

        result = await versions.getNextVersionFor(aPullRequest({
            state: 'closed',
            merged: true,
            merged_at: '2026-07-23T10:00:00Z',
            labels: [{ name: 'minor' }]
        }));
    });

    it('should not be a release', () => {
        result.isRelease.should.be.false;
    });

    it('should say that it was already released', () => {
        result.reason?.should.equal('already-released');
    });
});
