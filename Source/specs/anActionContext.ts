import { IActionContext } from '../IActionContext';
import { PullRequest } from '../PullRequest';
import { testMergeCommitSha } from './aPullRequest';

/**
 * Builds an action context for a spec. Defaults to a `pull_request` event without a pull request in the
 * payload - specs that need one pass it in.
 */
export const anActionContext = (pullRequest?: PullRequest, sha: string = testMergeCommitSha): IActionContext => ({
    eventName: 'pull_request',
    sha,
    repo: { owner: 'cratis', repo: 'release-action' },
    payload: { pull_request: pullRequest as unknown as Record<string, unknown> }
});
