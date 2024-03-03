import { context } from '@actions/github';
import { Octokit } from '@octokit/rest';

import { logger } from './logging';

import inputs from './inputs';
import outputs from './outputs';
import { IPullRequests } from './IPullRequests';
import { PullRequests } from './PullRequests';
import { IVersions } from './IVersions';
import { Versions } from './Versions';
import { Tags } from './Tags';
import { SemVer } from 'semver';
import { VersionInfo } from './VersionInfo';

const octokit = new Octokit({ auth: inputs.gitHubToken });

export class HandleVersion {

    constructor(readonly _pullRequests: IPullRequests, readonly _versions: IVersions) {
    }

    async run(): Promise<void> {
        try {
            let version: VersionInfo;
            outputs.setPrerelease(false);
            outputs.setIsolatedForPullRequest(false);
            outputs.setShouldPublish(false);

            if (!inputs.version || inputs.version === '') {
                let pullRequest = await this._pullRequests.getMergedPullRequest();
                if (!pullRequest) {
                    logger.info('No merged PR found. Trying open pull request for current sha.');
                    pullRequest = await this._pullRequests.getCurrentPullRequest();
                    if (!pullRequest) {
                        logger.error('No PR found.');
                        return;
                    }
                }
                if (!pullRequest.labels || pullRequest.labels.length === 0) {
                    logger.info('No release labels found.');
                    if (pullRequest.labels.length > 0) {
                        logger.info('Labels associated with PR:');
                        pullRequest.labels.forEach(_ => logger.info(`  - ${_}`));
                    }
                }

                version = await this._versions.getNextVersionFor(pullRequest);
                if (!version || !version.isRelease) return;
            } else {
                const semVer = new SemVer(inputs.version!);
                version = new VersionInfo(semVer, false, false, false, true, semVer.prerelease.length !== 0, false, true);
                logger.info('Using explicitly set version number');
            }

            outputs.setVersion(version.version.version);
            outputs.setShouldPublish(true);
            outputs.setPrerelease(version.isPrerelease);
            outputs.setIsolatedForPullRequest(version.isIsolatedForPullRequest);
        } catch (ex) {
            logger.error("Something went wrong");
            logger.error(ex);

            outputs.setShouldPublish(false);
        }
    }
}

new HandleVersion(
    new PullRequests(octokit, context, logger),
    new Versions(octokit, context, new Tags(octokit, context, logger), logger)).run();
