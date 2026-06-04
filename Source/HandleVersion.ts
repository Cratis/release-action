import { context } from '@actions/github';
import { exportVariable } from '@actions/core';
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

                if( pullRequest.user?.login.indexOf('dependabot') !== -1) {
                    logger.info(`Dependabot (${pullRequest.user?.login}) PR detected. Skipping version creation.`);
                    outputs.setShouldPublish(false);
                    return;
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

            // Export version and metadata as environment variables for post step
            // This ensures the post step uses the same version that was calculated here,
            // preventing duplicate releases if the version calculation were to run again.
            // Only release versions (isRelease=true) are exported, as the above check
            // ensures this function only continues if version.isRelease is true.
            exportVariable('OUTPUT_VERSION', version.version.version);
            exportVariable('OUTPUT_VERSION_IS_PRERELEASE', String(version.isPrerelease));
            exportVariable('OUTPUT_VERSION_IS_ISOLATED', String(version.isIsolatedForPullRequest));            
        } catch (ex) {
            logger.error("Something went wrong");
            logger.error(ex);

            outputs.setShouldPublish(false);
        }
    }
}

const handleVersion = new HandleVersion(
    new PullRequests(octokit, context, logger),
    new Versions(octokit, context, new Tags(octokit, context, logger), logger));

handleVersion.run();

export async function run(): Promise<void> {
    await handleVersion.run();
}


