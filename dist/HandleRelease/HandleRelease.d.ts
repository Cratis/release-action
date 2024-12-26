import { Context } from '@actions/github/lib/context';
import { IPullRequests } from './IPullRequests';
import { IVersions } from './IVersions';
export declare class HandleRelease {
    readonly _pullRequests: IPullRequests;
    readonly _context: Context;
    readonly _versions: IVersions;
    constructor(_pullRequests: IPullRequests, _context: Context, _versions: IVersions);
    run(): Promise<void>;
}
