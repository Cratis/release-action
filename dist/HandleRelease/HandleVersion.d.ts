import { IPullRequests } from './IPullRequests';
import { IVersions } from './IVersions';
export declare class HandleVersion {
    readonly _pullRequests: IPullRequests;
    readonly _versions: IVersions;
    constructor(_pullRequests: IPullRequests, _versions: IVersions);
    run(): Promise<void>;
}
export declare function run(): Promise<void>;
