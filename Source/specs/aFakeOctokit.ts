import { Octokit } from '@octokit/rest';
import sinon, { SinonStub } from 'sinon';

export type FakeOctokit = {
    octokit: Octokit;
    getCommit: SinonStub;
    getReleaseByTag: SinonStub;
    createRelease: SinonStub;
    pullsGet: SinonStub;
    setReleases(releases: unknown[]): void;
    setTags(tags: unknown[]): void;
    setAssociatedPullRequests(pullRequests: unknown[]): void;
    paginateRejects(error: unknown): void;
};

/**
 * Builds a fake Octokit for a spec - just the handful of endpoints the action calls, each arrangeable. The
 * endpoints passed to `paginate` are opaque markers, so `paginate` routes on which marker it was given and
 * returns the data the spec set for it.
 */
export const aFakeOctokit = (): FakeOctokit => {
    const listReleases = {};
    const listTags = {};
    const listPullRequestsAssociatedWithCommit = {};

    const store = new Map<object, unknown[]>([
        [listReleases, []],
        [listTags, []],
        [listPullRequestsAssociatedWithCommit, []]
    ]);

    const paginate = sinon.stub().callsFake((endpoint: object) => Promise.resolve(store.get(endpoint) ?? []));

    const getCommit = sinon.stub();
    const getReleaseByTag = sinon.stub();
    const createRelease = sinon.stub().resolves();
    const pullsGet = sinon.stub();

    const octokit = {
        paginate,
        repos: { getCommit, getReleaseByTag, createRelease, listReleases, listTags, listPullRequestsAssociatedWithCommit },
        pulls: { get: pullsGet }
    } as unknown as Octokit;

    return {
        octokit,
        getCommit,
        getReleaseByTag,
        createRelease,
        pullsGet,
        setReleases: releases => store.set(listReleases, releases),
        setTags: tags => store.set(listTags, tags),
        setAssociatedPullRequests: pullRequests => store.set(listPullRequestsAssociatedWithCommit, pullRequests),
        paginateRejects: error => paginate.callsFake(() => Promise.reject(error))
    };
};
