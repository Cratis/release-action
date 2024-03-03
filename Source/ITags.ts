import { Octokit } from '@octokit/rest';

export interface ITags {
    getLatestTag(releasesOnly: boolean, prefix: string, regex: string, sortTags: boolean): Promise<string>;
}
