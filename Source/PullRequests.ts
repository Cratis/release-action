import { Octokit } from '@octokit/rest';

import { IActionContext } from './IActionContext';
import { ILogger } from './ILogger';
import { IPullRequests } from './IPullRequests';
import { PullRequest, isMerged } from './PullRequest';

const mergeCommitMessageExpression = /Merge pull request #(\d+) from/;

export class PullRequests implements IPullRequests {
    constructor(readonly _octokit: Octokit, readonly _context: IActionContext, readonly _logger: ILogger) {
    }

    async getMergedPullRequest(): Promise<PullRequest | undefined> {
        const pullRequestFromEvent = this.getPullRequestFromEvent();
        if (pullRequestFromEvent) {
            if (!isMerged(pullRequestFromEvent)) {
                this._logger.info(
                    `Pull request #${pullRequestFromEvent.number} is '${pullRequestFromEvent.state}' and was never merged - it is not a release candidate.`);
                return undefined;
            }

            this._logger.info(`Using merged pull request #${pullRequestFromEvent.number} from the event payload.`);
            return pullRequestFromEvent;
        }

        return await this.getMergedPullRequestForSha(this._context.sha);
    }

    async getCurrentPullRequest(): Promise<PullRequest | undefined> {
        const pullRequestFromEvent = this.getPullRequestFromEvent();
        if (!pullRequestFromEvent) {
            this._logger.info('There is no pull request associated with the current event.');
            return undefined;
        }

        return pullRequestFromEvent;
    }

    async getCommitMessage(sha: string): Promise<string | undefined> {
        const { owner, repo } = this._context.repo;

        const commit = await this._octokit.repos.getCommit({ owner, repo, ref: sha });
        return commit.data.commit.message;
    }

    /**
     * Gets the pull request carried by the webhook payload. This is the authoritative source whenever the
     * workflow is triggered by a pull request event - it is a complete pull request object, it reflects the
     * state at the time the event fired, and it costs no API calls.
     */
    private getPullRequestFromEvent(): PullRequest | undefined {
        const pullRequest = this._context.payload.pull_request;
        if (!pullRequest) return undefined;

        return pullRequest as unknown as PullRequest;
    }

    /**
     * Finds the merged pull request that produced a commit. Used when the workflow is triggered by a push
     * rather than by a pull request event.
     */
    private async getMergedPullRequestForSha(sha: string): Promise<PullRequest | undefined> {
        this._logger.info(`Looking for a merged pull request for commit '${sha}'.`);

        const associated = await this.getPullRequestsAssociatedWith(sha);
        const merged = associated.filter(isMerged);

        const byMergeCommit = merged.find(pullRequest => pullRequest.merge_commit_sha === sha);
        if (byMergeCommit) {
            this._logger.info(`Commit '${sha}' is the merge commit of pull request #${byMergeCommit.number}.`);
            return byMergeCommit;
        }

        const fromCommitMessage = await this.getMergedPullRequestFromCommitMessage(sha);
        if (fromCommitMessage) return fromCommitMessage;

        if (merged.length === 1) {
            this._logger.info(`Commit '${sha}' is associated with exactly one merged pull request - #${merged[0].number}.`);
            return merged[0];
        }

        this._logger.info(`No merged pull request found for commit '${sha}'.`);
        return undefined;
    }

    private async getPullRequestsAssociatedWith(sha: string): Promise<PullRequest[]> {
        try {
            const associated = await this._octokit.paginate(
                this._octokit.repos.listPullRequestsAssociatedWithCommit,
                {
                    owner: this._context.repo.owner,
                    repo: this._context.repo.repo,
                    commit_sha: sha,
                    per_page: 100
                });

            return associated as unknown as PullRequest[];
        } catch (ex) {
            this._logger.warn(`Could not list the pull requests associated with commit '${sha}'.`);
            this._logger.warn(ex);
            return [];
        }
    }

    private async getMergedPullRequestFromCommitMessage(sha: string): Promise<PullRequest | undefined> {
        const message = await this.getCommitMessage(sha);
        const match = message?.match(mergeCommitMessageExpression);
        if (!match) return undefined;

        const number = parseInt(match[1], 10);
        this._logger.info(`The commit message of '${sha}' refers to pull request #${number}.`);

        const pullRequest = await this.getPullRequest(number);
        if (!pullRequest) return undefined;

        if (!isMerged(pullRequest)) {
            this._logger.info(`Pull request #${number} was never merged - it is not a release candidate.`);
            return undefined;
        }

        return pullRequest;
    }

    private async getPullRequest(number: number): Promise<PullRequest | undefined> {
        try {
            const { data } = await this._octokit.pulls.get({
                owner: this._context.repo.owner,
                repo: this._context.repo.repo,
                pull_number: number
            });

            return data as unknown as PullRequest;
        } catch (ex) {
            this._logger.warn(`Could not get pull request #${number}.`);
            this._logger.warn(ex);
            return undefined;
        }
    }
}
