import { SemVer } from 'semver';
import sinon, { SinonStub } from 'sinon';

import { IReleases } from '../IReleases';

export type StubbedReleases = IReleases & {
    getLatestReleaseVersion: SinonStub;
    existsForTag: SinonStub;
    existsForSha: SinonStub;
    create: SinonStub;
};

/**
 * Builds stubbed releases for a spec, with nothing released yet for the given version.
 */
export const someReleases = (latestReleaseVersion: SemVer = new SemVer('1.2.3')): StubbedReleases => ({
    getLatestReleaseVersion: sinon.stub().resolves(latestReleaseVersion),
    existsForTag: sinon.stub().resolves(false),
    existsForSha: sinon.stub().resolves(false),
    create: sinon.stub().resolves()
});
