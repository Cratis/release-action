import { beforeEach, describe, it } from 'vitest';

import { VersionInfo } from '../../VersionInfo';
import { Versions } from '../../Versions';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { someReleases } from '../../specs/someReleases';

// `no-release` is a decision that nothing consumer-facing changed, not an omission - it must resolve to its
// own reason rather than being indistinguishable from a pull request nobody labeled at all.
describe('when getting the next version for a merged pull request with the no-release label', () => {
    let result: VersionInfo;

    beforeEach(async () => {
        const versions = new Versions(someReleases(), new RecordingLogger());

        result = await versions.getNextVersionFor(aPullRequest({
            state: 'closed',
            merged: true,
            merged_at: '2026-07-23T10:00:00Z',
            labels: [{ name: 'no-release' }]
        }));
    });

    it('should not be a release', () => {
        result.isRelease.should.be.false;
    });

    it('should give the no-release reason', () => {
        result.reason?.should.equal('no-release');
    });
});

// The gate that keeps `no-release` and a bump label from ever sharing a pull request lives upstream, so the
// action still has to answer for the combination on its own: suppression wins, because releasing is the
// irreversible answer to an ambiguity.
describe('when getting the next version for a merged pull request with both no-release and patch labels', () => {
    let result: VersionInfo;

    beforeEach(async () => {
        const versions = new Versions(someReleases(), new RecordingLogger());

        result = await versions.getNextVersionFor(aPullRequest({
            state: 'closed',
            merged: true,
            merged_at: '2026-07-23T10:00:00Z',
            labels: [{ name: 'no-release' }, { name: 'patch' }]
        }));
    });

    it('should not be a release', () => {
        result.isRelease.should.be.false;
    });

    it('should give the no-release reason', () => {
        result.reason?.should.equal('no-release');
    });
});
