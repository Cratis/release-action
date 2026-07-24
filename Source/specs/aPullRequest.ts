import { PullRequest } from '../PullRequest';

/**
 * The SHA a `pull_request` event reports as `github.sha` - the ephemeral merge commit of
 * `refs/pull/<number>/merge`, which GitHub also reports as the pull request's `merge_commit_sha` for as long
 * as it has not been merged.
 */
export const testMergeCommitSha = 'cf05d51ebb7a068849e3a03ceaf969cc22dfeff7';

export const headSha = '1234567890abcdef1234567890abcdef12345678';

/**
 * Builds a pull request for a spec. Defaults to an open, unlabeled pull request from a regular branch - every
 * spec states only what actually matters to it.
 */
export const aPullRequest = (overrides: Partial<PullRequest> = {}): PullRequest => ({
    number: 42,
    state: 'open',
    labels: [],
    body: 'The body of the pull request',
    url: 'https://api.github.com/repos/cratis/release-action/pulls/42',
    html_url: 'https://github.com/cratis/release-action/pull/42',
    base: { ref: 'main', sha: 'fedcba0987654321fedcba0987654321fedcba09' },
    head: { ref: 'some-feature', sha: headSha },
    draft: false,
    user: { login: 'someone' },
    merged: false,
    merged_at: null,
    merge_commit_sha: testMergeCommitSha,
    ...overrides
});
