import { Context } from '@actions/github/lib/context';
import { Octokit } from '@octokit/rest';
import winston from 'winston';
import { PullRequest } from './PullRequest';
import { IVersions } from './IVersions';
import { VersionInfo } from './VersionInfo';
import { ITags } from './ITags';
export declare class Versions implements IVersions {
    readonly _octokit: Octokit;
    readonly _context: Context;
    readonly _tags: ITags;
    readonly _logger: winston.Logger;
    constructor(_octokit: Octokit, _context: Context, _tags: ITags, _logger: winston.Logger);
    getNextVersionFor(pullRequest: PullRequest): Promise<VersionInfo>;
    private getActualVersion;
    private getPullRequestPrerelease;
    private get sha();
}
