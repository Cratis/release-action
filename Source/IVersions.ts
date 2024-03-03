import { PullRequest } from './PullRequest';
import { VersionInfo } from "./VersionInfo";


export interface IVersions {
    getNextVersionFor(pullRequest: PullRequest): Promise<VersionInfo>;
}
