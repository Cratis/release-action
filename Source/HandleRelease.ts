import { context } from '@actions/github';
import { Context } from '@actions/github/lib/context';
import { Octokit } from '@octokit/rest';

import { logger } from './logging';
import inputs from './inputs';
import { Versions } from './Versions';
import { IPullRequests } from './IPullRequests';
import { PullRequests } from './PullRequests';
import { IVersions } from './IVersions';
import { Tags } from './Tags';
import { PullRequest } from './PullRequest';
import { VersionInfo } from './VersionInfo';
import { SemVer } from 'semver';

const octokit = new Octokit({ auth: inputs.gitHubToken });

export class HandleRelease {

    constructor(readonly _pullRequests: IPullRequests, readonly _context: Context, readonly _versions: IVersions) {
    }

    async run(): Promise<void> {
        let pullRequest: PullRequest | undefined;
        let version: VersionInfo | undefined;
        let releaseNotes: string | undefined;
        let associatedNumber = 0;
        let associatedLink = '';

        if (!inputs.version || inputs.version === '') {
            pullRequest = await this._pullRequests.getMergedPullRequest();
            if (!pullRequest) return;

            releaseNotes = pullRequest.body || '';
            associatedNumber = pullRequest.number;
            associatedLink = pullRequest.html_url;

            if( pullRequest.author?.login.indexOf('dependabot') !== -1) {
                logger.info(`Dependabot (${pullRequest.author?.login}) PR detected. Skipping release creation.`);
                return;
            }

            version = await this._versions.getNextVersionFor(pullRequest);
            if (!version || version.isPrerelease || !version.version) return;
        } else {
            const semVer = new SemVer(inputs.version!);
            version = new VersionInfo(semVer, false, false, false, true, semVer.prerelease.length !== 0, false, true);
            releaseNotes = inputs.releaseNotes || '';
            logger.info('Using explicitly set version number');
            logger.info(`Release notes: ${releaseNotes}`);
        }

        logger.info(`Create release for version '${version.version}'`);

        // GitHub Create Release documentation: https://developer.github.com/v3/repos/releases/#create-a-release
        // GitHub Octokit Create Release documentation: https://octokit.github.io/rest.js/v18#repos-create-release

        const release = {
            owner: this._context.repo.owner,
            repo: this._context.repo.repo,
            tag_name: `v${version.version}`,
            name: `Release v${version.version}`,
            body: releaseNotes,
            prerelease: false,
            target_commitish: this._context.sha
        };

        logger.info('Release object:');
        logger.info(release);

        await octokit.repos.createRelease(release);
        logger.info('GitHub release created');
    }
}

new HandleRelease(
    new PullRequests(octokit, context, logger),
    context,
    new Versions(octokit, context, new Tags(octokit, context, logger), logger)).run();
