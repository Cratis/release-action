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

    private validateInput(value: string | null | undefined, fieldName: string): boolean {
        if (value == null || value.trim() === '') {
            logger.warn(`⚠️  No ${fieldName} provided. Skipping release creation.`);
            return false;
        }
        return true;
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

            if (pullRequest.user?.login.indexOf('dependabot') !== -1) {
                logger.info(`Dependabot (${pullRequest.user?.login}) PR detected. Skipping release creation.`);
                return;
            }

            // Try to get the pre-calculated version from the main step output
            const preCalculatedVersion = process.env.OUTPUT_VERSION;
            if (preCalculatedVersion) {
                logger.info(`Using pre-calculated version from main step: ${preCalculatedVersion}`);
                // Define constants for VersionInfo parameters
                // Version bump type flags are not needed for release creation, so they default to unknown/false
                const VERSION_BUMP_TYPE_UNKNOWN = false;
                const isRelease = true; // Only release versions (isRelease=true) are exported from main step

                try {
                    const semVer = new SemVer(preCalculatedVersion);
                    // Read version metadata from exported environment variables
                    const isPrerelease = process.env.OUTPUT_VERSION_IS_PRERELEASE === 'true';
                    const isIsolatedForPullRequest = process.env.OUTPUT_VERSION_IS_ISOLATED === 'true';
                    const isValid = true;   // Version is valid since it was calculated and exported by main step

                    // Create VersionInfo with pre-calculated version and exported metadata
                    // Note: Version bump type flags (isMajor, isMinor, isPatch) are not exported
                    // because they are only needed during version calculation, not for release creation.
                    version = new VersionInfo(
                        semVer,
                        VERSION_BUMP_TYPE_UNKNOWN, // isMajor
                        VERSION_BUMP_TYPE_UNKNOWN, // isMinor
                        VERSION_BUMP_TYPE_UNKNOWN, // isPatch
                        isRelease,
                        isPrerelease,
                        isIsolatedForPullRequest,
                        isValid
                    );
                } catch (ex) {
                    logger.error(`Failed to parse pre-calculated version: ${preCalculatedVersion}`);
                    logger.error(ex);
                    // Fall back to calculating the version if parsing fails
                    version = await this._versions.getNextVersionFor(pullRequest);
                }
            } else {
                // Fall back to calculating the version if not provided by main step
                version = await this._versions.getNextVersionFor(pullRequest);
            }

            if (!version || version.isPrerelease || !version.version) return;
        } else {
            // Validate required inputs when explicitly provided
            if (!this.validateInput(inputs.version, 'version input')) {
                return;
            }

            if (!this.validateInput(inputs.releaseNotes, 'release notes')) {
                return;
            }

            // Validate semantic version format using SemVer constructor
            let semVer: SemVer;
            try {
                semVer = new SemVer(inputs.version!);
            } catch (ex) {
                logger.error(`❌ Invalid semantic version format: "${inputs.version}". Expected format: X.Y.Z`);
                throw new Error(`Invalid version format: ${inputs.version}`);
            }

            version = new VersionInfo(semVer, false, false, false, true, semVer.prerelease.length !== 0, false, true);
            releaseNotes = inputs.releaseNotes || '';
            logger.info('Using explicitly set version number');
            logger.info(`Release notes: ${releaseNotes}`);
        }

        logger.info(`Create release for version '${version.version}'`);

        // Check if a release already exists for this commit
        const tags = new Tags(octokit, this._context, logger);
        if (await tags.releaseExistsForSha(this._context.sha)) {
            logger.warn(`⚠️  Release already exists for commit ${this._context.sha}. Skipping duplicate.`);
            return;
        }

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