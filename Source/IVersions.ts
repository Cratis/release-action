import { PullRequest } from './PullRequest';
import { VersionInfo } from "./VersionInfo";


export interface IVersions {
    getNextVersionFor(pullRequest: PullRequest): Promise<VersionInfo>;

    /** Bumps the latest version, optionally guarding against a previously released batch target. */
    nextVersionFor?(bump: 'major' | 'minor' | 'patch', targetCommitish?: string): Promise<VersionInfo>;
}
