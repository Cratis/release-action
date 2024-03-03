import { Context } from '@actions/github/lib/context';
import { Octokit } from '@octokit/rest';
import semver, { SemVer } from 'semver';
import winston from 'winston';

import { PullRequest } from './PullRequest';
import { IVersions } from './IVersions';
import { VersionInfo } from './VersionInfo';
import { ITags } from './ITags';


export class Versions implements IVersions {
    constructor(readonly _octokit: Octokit, readonly _context: Context, readonly _tags: ITags, readonly _logger: winston.Logger) {
    }

    async getNextVersionFor(pullRequest: PullRequest): Promise<VersionInfo> {
        let isMajor = false;
        let isMinor = false;
        let isPatch = false;
        let isIsolatedForPullRequest = false;

        let version = semver.parse(pullRequest.head.ref);
        if (version) {
            isIsolatedForPullRequest = version.prerelease.length !== 0;
            version = this.getActualVersion(version, pullRequest);
        } else {
            version = semver.parse(pullRequest.base.ref);
            if (version) {
                isIsolatedForPullRequest = version.prerelease.length !== 0;
                version = this.getActualVersion(version, pullRequest);
            }
        }

        if (!version) {
            let latestTag = await this._tags.getLatestTag(
                true,
                'v',
                '',
                true);

            if (latestTag.toLowerCase().startsWith('v')) {
                latestTag = latestTag.substring(1);
            }
            this._logger.info(`Latest tag: ${latestTag}`);

            if (pullRequest.state === 'closed') {
                version = semver.parse(latestTag);
            } else {
                if (!pullRequest.draft) {
                    this._logger.info('Pull request is not in draft.')
                    return VersionInfo.noRelease;
                }
                version = semver.parse(`${latestTag}-${this.getPullRequestPrerelease(pullRequest)}`);
            }
        }

        if (!version) {
            this._logger.error(`Version string '${version}' is not in a valid format`);
            return VersionInfo.invalid;
        }

        if (pullRequest.state === 'closed') {
            isMajor = pullRequest.labels.some(_ => _.name === 'major');
            if (!isMajor) {
                isMinor = pullRequest.labels.some(_ => _.name === 'minor');
                if (!isMinor) {
                    isPatch = pullRequest.labels.some(_ => _.name === 'patch');
                }
            }

            if (!isMajor && !isMinor && !isPatch) {
                this._logger.info('No release related labels associated with the PR.');
                if (pullRequest.labels.length > 0) {
                    this._logger.info('Labels associated with PR:');
                    pullRequest.labels.forEach(_ => this._logger.info(`  - ${_.name}`));
                }

                return VersionInfo.noRelease;
            }

            if (isMajor) version = version.inc('major') || version;
            if (isMinor) version = version.inc('minor') || version;
            if (isPatch) version = version.inc('patch') || version;
        }

        this._logger.info(`New version is '${version.version}'`);

        return new VersionInfo(version, isMajor, isMinor, isPatch, true, version.prerelease.length > 0, isIsolatedForPullRequest, true);
    }

    private getActualVersion(version: semver.SemVer, pullRequest: PullRequest) {
        if (version.prerelease.length == 0) {
            return new SemVer(`${version.major}.${version.minor}.${version.patch}-${this.getPullRequestPrerelease(pullRequest)}`);
        } else {
            return new SemVer(`${version.major}.${version.minor}.${version.patch}-${version.prerelease[0]}.${this.sha}`);
        }
    }

    private getPullRequestPrerelease(pullRequest: PullRequest) {
        return `pr${pullRequest.number}.${this.sha}`;
    }

    private get sha() {
        return this._context.sha.substring(0, 7);
    }
}
