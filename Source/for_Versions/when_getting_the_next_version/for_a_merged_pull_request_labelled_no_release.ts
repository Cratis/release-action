import { beforeEach, describe, it } from 'vitest';

import { VersionInfo } from '../../VersionInfo';
import { Versions } from '../../Versions';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { someReleases } from '../../specs/someReleases';

describe('when getting the next version for a merged pull request labelled no-release', () => {
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

    it('should say that not releasing was the decision', () => {
        result.reason?.should.equal('no-release');
    });
});

// The gate that keeps `no-release` and a bump label from ever sharing a pull request lives upstream, so the
// action still has to answer for the combination on its own: suppression wins, because releasing is the
// irreversible answer to an ambiguity.
describe('when getting the next version for a merged pull request labelled both no-release and patch', () => {
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

    it('should say that not releasing was the decision', () => {
        result.reason?.should.equal('no-release');
    });
});
