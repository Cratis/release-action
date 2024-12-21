import { Context } from '@actions/github/lib/context';
import { Octokit } from '@octokit/rest';
import winston from 'winston';
import { IPullRequests } from './IPullRequests';
import { PullRequest } from './PullRequest';
export declare class PullRequests implements IPullRequests {
    readonly _octokit: Octokit;
    readonly _context: Context;
    readonly _logger: winston.Logger;
    constructor(_octokit: Octokit, _context: Context, _logger: winston.Logger);
    getMergedPullRequest(): Promise<PullRequest | undefined>;
    getCurrentPullRequest(): Promise<PullRequest | undefined>;
}
