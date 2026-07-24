import { setFailed } from '@actions/core';
import { context } from '@actions/github';
import { Octokit } from '@octokit/rest';

import { HandleRelease } from './HandleRelease';
import { ReleaseDecisions } from './ReleaseDecisions';
import { Releases } from './Releases';
import { inputs } from './inputs';
import { logger } from './logging';

const run = async (): Promise<void> => {
    const octokit = new Octokit({ auth: inputs.gitHubToken || undefined });

    const handleRelease = new HandleRelease(
        new Releases(octokit, context, logger, inputs.tagPrefix),
        new ReleaseDecisions(),
        context,
        logger);

    await handleRelease.run();
};

run().catch(ex => setFailed(ex instanceof Error ? ex : String(ex)));
