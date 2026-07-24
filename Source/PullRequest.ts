import { Label } from './Label';

// https://docs.github.com/en/rest/pulls/pulls

export type Branch = {
    ref: string;
    sha: string;
};

export type Actor = {
    login: string;
};

export type PullRequest = {
    labels: Label[];
    body: string | null;
    url: string;
    html_url: string;
    number: number;
    base: Branch;
    head: Branch;
    state: string;
    draft?: boolean;
    user?: Actor | null;

    /**
     * Only present on the single-pull-request endpoint and on webhook payloads - it is absent from the
     * list endpoints, which is why {@link isMerged} also considers {@link merged_at}.
     */
    merged?: boolean;

    /**
     * Set to the timestamp of the merge, and `null` for a pull request that is still open or that was
     * closed without being merged.
     */
    merged_at?: string | null;

    /**
     * Beware: this is *not* a reliable indicator that a pull request was merged. While a pull request is
     * open, GitHub sets it to the SHA of the ephemeral *test* merge commit, and that value is retained
     * after the pull request is closed without being merged. Only after an actual merge does it point at
     * the commit on the base branch.
     */
    merge_commit_sha?: string | null;
};

/**
 * Whether the pull request was actually merged, as opposed to merely being closed.
 *
 * This is the single gate that decides whether a release may be produced. `state === 'closed'` is *not*
 * sufficient: a pull request that is closed without being merged is also `closed`, and its
 * `merge_commit_sha` still holds the last test merge commit - which is exactly the SHA a `pull_request`
 * event reports as `github.sha`. Keying off anything other than the merge itself is what caused closed,
 * unmerged pull requests to produce GitHub releases.
 */
export const isMerged = (pullRequest: PullRequest): boolean =>
    pullRequest.merged === true || Boolean(pullRequest.merged_at);

/**
 * Whether the pull request reached its final state without ever being merged. Nothing may be released
 * for such a pull request - not a release version and not a prerelease.
 */
export const isClosedWithoutBeingMerged = (pullRequest: PullRequest): boolean =>
    pullRequest.state === 'closed' && !isMerged(pullRequest);

/**
 * Whether the pull request was raised by Dependabot. Dependency bumps are never released on their own.
 */
export const isFromDependabot = (pullRequest: PullRequest): boolean =>
    (pullRequest.user?.login ?? '').toLowerCase().includes('dependabot');
