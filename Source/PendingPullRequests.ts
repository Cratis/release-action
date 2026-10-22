// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { Octokit } from '@octokit/rest';

import { IActionContext } from './IActionContext';
import { ILogger } from './ILogger';
import { IPendingPullRequests } from './IPendingPullRequests';
import { IReleases } from './IReleases';
import { PullRequest, isMerged } from './PullRequest';

export class PendingPullRequests implements IPendingPullRequests {
    constructor(
        readonly _octokit: Octokit,
        readonly _releases: IReleases,
        readonly _context: IActionContext,
        readonly _logger: ILogger) {
    }

    async get(upper: string): Promise<{ pullRequests: PullRequest[]; fallback: boolean }> {
        if (!this._releases.getLatestReleaseCommit) throw new Error('Release tag lookup is unavailable.');
        const lower = await this._releases.getLatestReleaseCommit();
        if (lower === upper) return { pullRequests: [], fallback: false };

        const { owner, repo } = this._context.repo;
        const commits: Awaited<ReturnType<Octokit['repos']['getCommit']>>['data'][] = [];
        let current: string | undefined = upper;
        while (current && current !== lower) {
            const { data: commit }: Awaited<ReturnType<Octokit['repos']['getCommit']>> =
                await this._octokit.repos.getCommit({ owner, repo, ref: current });
            commits.push(commit);
            current = commit.parents[0]?.sha;
        }

        if (lower && current !== lower) {
            const comparison = await this._octokit.repos.compareCommitsWithBasehead({ owner, repo, basehead: `${upper}...${lower}` });
            if (['ahead', 'identical'].includes(comparison.data.status)) return { pullRequests: [], fallback: false };
            this._logger.warn('The latest release tag is not on the first-parent history; falling back to single-PR behavior.');
            return { pullRequests: [], fallback: true };
        }

        const defaultBranch = (await this._octokit.repos.get({ owner, repo })).data.default_branch;
        const collected = new Map<number, PullRequest>();
        for (const commit of commits.reverse()) {
            const number = commit.parents.length > 1
                ? Number(commit.commit.message.match(/^Merge pull request #(\d+) from\b/)?.[1]) : 0;
            const candidates = number
                ? [(await this._octokit.pulls.get({ owner, repo, pull_number: number })).data as unknown as PullRequest]
                : await this._octokit.paginate(this._octokit.repos.listPullRequestsAssociatedWithCommit,
                    { owner, repo, commit_sha: commit.sha, per_page: 100 }) as unknown as PullRequest[];
            for (const pullRequest of candidates) {
                const matches = isMerged(pullRequest) && pullRequest.base.ref === defaultBranch && pullRequest.merge_commit_sha === commit.sha;
                if (number && (!matches || pullRequest.number !== number)) {
                    throw new Error(`Pull request #${number} is not a matching merge into ${defaultBranch}.`);
                }
                if (matches) collected.set(pullRequest.number, pullRequest);
            }
        }
        return { pullRequests: [...collected.values()], fallback: false };
    }
}
