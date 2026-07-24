import { Octokit } from '@octokit/rest';
import sinon, { SinonStub } from 'sinon';

export type FakeOctokit = {
    octokit: Octokit;
    paginate: SinonStub;
    getCommit: SinonStub;
    getReleaseByTag: SinonStub;
    createRelease: SinonStub;
    pullsGet: SinonStub;
};

/**
 * Builds a fake Octokit for a spec - just the handful of endpoints the action calls, each a stub the spec can
 * arrange. The endpoints passed to `paginate` are opaque markers, so the `paginate` stub ignores them and
 * simply returns whatever the spec resolves it with.
 */
export const aFakeOctokit = (): FakeOctokit => {
    const paginate = sinon.stub().resolves([]);
    const getCommit = sinon.stub();
    const getReleaseByTag = sinon.stub();
    const createRelease = sinon.stub().resolves();
    const pullsGet = sinon.stub();

    const octokit = {
        paginate,
        repos: {
            getCommit,
            getReleaseByTag,
            createRelease,
            listReleases: {},
            listPullRequestsAssociatedWithCommit: {}
        },
        pulls: {
            get: pullsGet
        }
    } as unknown as Octokit;

    return { octokit, paginate, getCommit, getReleaseByTag, createRelease, pullsGet };
};
