import { Octokit } from '@octokit/rest';

import { IActionContext } from './IActionContext';
import { IIssues } from './IIssues';
import { ILogger } from './ILogger';

export class Issues implements IIssues {

    constructor(
        readonly _octokit: Octokit,
        readonly _context: IActionContext,
        readonly _logger: ILogger) {
    }

    async close(number: number, comment: string): Promise<boolean> {
        const { owner, repo } = this._context.repo;

        // Asked for first so that an issue somebody already closed by hand is left exactly as they left it,
        // rather than gaining a comment saying a release closed it. A pull request shares the issue number
        // space and is excluded for the same reason - a release does not close a pull request.
        const existing = await this._octokit.rest.issues.get({ owner, repo, issue_number: number });
        if (existing.data.state !== 'open') {
            this._logger.info(`Issue #${number} is already closed - leaving it alone.`);
            return false;
        }

        if (existing.data.pull_request) {
            this._logger.info(`#${number} is a pull request rather than an issue - leaving it alone.`);
            return false;
        }

        await this._octokit.rest.issues.createComment({ owner, repo, issue_number: number, body: comment });
        await this._octokit.rest.issues.update({ owner, repo, issue_number: number, state: 'closed', state_reason: 'completed' });

        return true;
    }
}
