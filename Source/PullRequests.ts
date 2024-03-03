import { Context } from '@actions/github/lib/context';
import { Octokit } from '@octokit/rest';
import { pathToFileURL } from 'url';
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

        const mergedPullRequest = await this._octokit.paginate(
            this._octokit.pulls.list,
            {
                owner,
                repo,
                state: 'closed',
                sort: 'updated',
                direction: 'desc'
            }
        ).then(data => data.find(pr => pr.merge_commit_sha === sha));

        return mergedPullRequest;
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

        return pullRequest;
    }
}
