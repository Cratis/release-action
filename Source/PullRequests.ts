import { Context } from '@actions/github/lib/context';
import { Octokit } from '@octokit/rest';
import winston from 'winston';
import { IPullRequests } from './IPullRequests';
import { PullRequest } from './PullRequest';

export class PullRequests implements IPullRequests {
    constructor(readonly _octokit: Octokit, readonly _context: Context, readonly _logger: winston.Logger) {
    }

    async getMergedPullRequest(): Promise<PullRequest | undefined> {
        const owner = this._context.repo.owner;
        const repo = this._context.repo.repo;
        const sha = this._context.sha;

        this._logger.info(`Getting merged pull request for: '${sha}''`);

        const result = await this._octokit.paginate(
            this._octokit.pulls.list,
            {
                owner,
                repo,
                state: 'closed',
                sort: 'updated',
                direction: 'desc'
            }
        );

        let mergedPullRequest = result.find(pr => pr.merge_commit_sha === sha);
        if (!mergedPullRequest) {
            this._logger.info(`No merged PR found for commit '${sha}'. Trying to find one based on commit message.`);
            const commit = await this.getCommitMessage(sha);
            const match = commit?.match(/Merge pull request #(\d+) from/);
            if (match) {
                this._logger.info(`Found commit message match for PR #${match[1]}`);
                const prNumber = parseInt(match[1], 10);
                mergedPullRequest = result.find(pr => pr.number === prNumber);

                if (!mergedPullRequest) {
                    this._logger.info(`No merged PR found with number '${prNumber}'`);
                } else {
                    this._logger.info(`Found merged PR: ${mergedPullRequest.title}`);
                }
            }
        }

        return mergedPullRequest as PullRequest;
    }

    async getCurrentPullRequest(): Promise<PullRequest | undefined> {
        const owner = this._context.repo.owner;
        const repo = this._context.repo.repo;
        const pull_number = this._context.payload.pull_request?.number || undefined;

        if (!pull_number) {
            this._logger.info(`No pull request number associated`);
            return undefined;
        }

        this._logger.info(`Getting pull request '${pull_number}'`);

        const pullRequest = await this._octokit.paginate(
            this._octokit.pulls.list,
            {
                owner,
                repo,
                state: 'open',
                sort: 'updated',
                direction: 'desc'
            }
        ).then(data => data.find(pr => pr.number === pull_number));

        if (!pullRequest) {
            this._logger.info(`There is no open PR with number '${pull_number}'`);
        }

        return pullRequest as PullRequest;
    }

    async getCommitMessage(sha: string): Promise<string | undefined> {
        const owner = this._context.repo.owner;
        const repo = this._context.repo.repo;

        const commit = await this._octokit.repos.getCommit({
            owner,
            repo,
            ref: sha
        });

        return commit.data.commit.message;
    }
}
