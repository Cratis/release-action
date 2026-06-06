import { Octokit } from '@octokit/rest';
import winston from 'winston';
import { ITags } from './ITags';
import { Context } from '@actions/github/lib/context';
export declare class Tags implements ITags {
    readonly _octokit: Octokit;
    readonly _context: Context;
    readonly _logger: winston.Logger;
    constructor(_octokit: Octokit, _context: Context, _logger: winston.Logger);
    getLatestTag(releasesOnly: boolean, prefix: string, regex: string, sortTags: boolean): Promise<string>;
    getItemsFromPages(octokit: Octokit, pages: any): AsyncGenerator<any, void, unknown>;
    /**
     * Checks if a release already exists for the given commit SHA
     * @param sha The commit SHA to check
     * @returns true if a release exists for this SHA, false otherwise
     */
    releaseExistsForSha(sha: string): Promise<boolean>;
    /**
     * Gets all releases for the repository
     * @returns Array of release objects
     */
    private getReleases;
}
