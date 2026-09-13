import { setFailed } from '@actions/core';
import { context } from '@actions/github';
import { Octokit } from '@octokit/rest';

import { HandleRelease } from './HandleRelease';
import { Issues } from './Issues';
import { ReleaseDecisions } from './ReleaseDecisions';
import { Releases } from './Releases';
import { inputs } from './inputs';
import { logger } from './logging';

const run = async (): Promise<void> => {
    // GITHUB_API_URL is always set by the runner (to https://api.github.com on github.com, or the enterprise
    // host on GitHub Enterprise Server), so honoring it keeps the action working on both.
    const octokit = new Octokit({ auth: inputs.gitHubToken || undefined, baseUrl: process.env.GITHUB_API_URL || undefined });

    const handleRelease = new HandleRelease(
        new Releases(octokit, context, logger, inputs.tagPrefix),
        new ReleaseDecisions(),
        new Issues(octokit, context, logger),
        context,
        logger,
        inputs.closeResolvedIssues);

    await handleRelease.run();
};

run().catch(ex => setFailed(ex instanceof Error ? ex : String(ex)));
