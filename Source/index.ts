import { context } from '@actions/github';
import { Octokit } from '@octokit/rest';

import { logger } from './logging';

import inputs from './inputs';
import outputs from './outputs';
import { getNextVersion } from './version';
import { PullRequest } from './PullRequest';

const octokit = new Octokit({ auth: inputs.gitHubToken });

run();
async function run() {
    try {
        const pullRequest = await getMergedPullRequest(context.repo.owner, context.repo.repo, context.sha);
        if (!pullRequest) {
            logger.error('No merged PR found.');
            return;
        }
        if (!pullRequest.labels || pullRequest.labels.length === 0) {
            logger.info('No release labels found.');
            if (pullRequest.labels.length > 0) {
                logger.info('Labels associated with PR:');
                pullRequest.labels.forEach(_ => logger.info(`  - ${_}`));
            }
            outputs.setShouldPublish(false);
            return;
        }

        const version = await getNextVersion(octokit, pullRequest);
        if (!version) return;

        logger.info(`Create release for version '${version.version}'`);

        // GitHub Create Release documentation: https://developer.github.com/v3/repos/releases/#create-a-release
        // GitHub Octokit Create Release documentation: https://octokit.github.io/rest.js/v18#repos-create-release
        
        const release = {
            owner: context.repo.owner,
            repo: context.repo.repo,
            tag_name: `v${version.version}`,
            name: `Release v${version.version}`,
            body: pullRequest.body || '',
            prerelease: false,
            target_commitish: context.sha
        };

        logger.info('Release object:');
        logger.info(release);

        await octokit.repos.createRelease(release);

        logger.info('GitHub release created');

        outputs.setVersion(version.version);
        outputs.setShouldPublish(true);
    } catch (ex) {
        logger.error("Something went wrong");
        logger.error(ex);

        outputs.setShouldPublish(false);
    }
}


async function getMergedPullRequest(owner: string, repo: string, sha: string): Promise<PullRequest | undefined> {
    logger.debug(`Getting merged pull request for: '${sha}''`);

    const mergedPullRequest = await octokit.paginate(
        octokit.pulls.list,
        { owner, repo, state: 'closed', sort: 'updated', direction: 'desc' }
    ).then(data => data.find(pr => pr.merge_commit_sha === sha));

    return mergedPullRequest;
}