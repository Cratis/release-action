import { Octokit } from '@octokit/rest';
import { cmpTags } from 'tag-cmp';
import { logger } from './logging';
import winston from 'winston';
import { ITags } from './ITags';
import { Context } from '@actions/github/lib/context';

export class Tags implements ITags {

    constructor(readonly _octokit: Octokit, readonly _context: Context, readonly _logger: winston.Logger) {
    }

    async getLatestTag(releasesOnly: boolean, prefix: string, regex: string, sortTags: boolean): Promise<string> {
        try {
            const owner = this._context.repo.owner;
            const repo = this._context.repo.repo;

            const endpoint = (releasesOnly ? this._octokit.repos.listReleases : this._octokit.repos.listTags);
            const pages = endpoint.endpoint.merge({ "owner": owner, "repo": repo, "per_page": 100 });

            const tags: string[] = [];
            for await (const item of this.getItemsFromPages(this._octokit, pages)) {
                const tag: string = (releasesOnly ? item["tag_name"] : item["name"]);
                if (!tag.startsWith(prefix)) {
                    continue;
                }
                if (regex && !new RegExp(regex).test(tag)) {
                    continue;
                }
                if (!sortTags) {
                    // Assume that the API returns the most recent tag(s) first.
                    return tag;
                }
                tags.push(tag);
            }
            if (tags.length === 0) {
                let error = `The repository "${owner}/${repo}" has no `;
                error += releasesOnly ? "releases" : "tags";
                if (prefix) {
                    error += ` matching "${prefix}*"`;
                }
                throw error;
            }
            tags.sort(cmpTags);
            const [latestTag] = tags.slice(-1);
            return latestTag;
        } catch (ex) {
            this._logger.warn(`Couldn't get latest tag - defaulting to v0.0.0 (could be the first time this is run on the repo)`);
            this._logger.warn(ex);
            return 'v0.0.0';
        }
    }

    async* getItemsFromPages(octokit: Octokit, pages) {
        for await (const page of octokit.paginate.iterator(pages)) {
            for (const item of page.data) {
                yield item;
            }
        }
    }
}