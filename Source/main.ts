import { setFailed } from '@actions/core';
import { context } from '@actions/github';
import { Octokit } from '@octokit/rest';

import { HandleVersion } from './HandleVersion';
import { PullRequests } from './PullRequests';
import { ReleaseDecisions } from './ReleaseDecisions';
import { Releases } from './Releases';
import { Versions } from './Versions';
import { inputs } from './inputs';
import { logger } from './logging';
import { setOutputsFrom } from './outputs';
import { writeSummary } from './summary';

const run = async (): Promise<void> => {
    // GITHUB_API_URL is always set by the runner (to https://api.github.com on github.com, or the enterprise
    // host on GitHub Enterprise Server), so honoring it keeps the action working on both.
    const octokit = new Octokit({ auth: inputs.gitHubToken || undefined, baseUrl: process.env.GITHUB_API_URL || undefined });
    const releases = new Releases(octokit, context, logger, inputs.tagPrefix);

    const handleVersion = new HandleVersion(
        new PullRequests(octokit, context, logger),
        new Versions(releases, logger, inputs),
        new ReleaseDecisions(),
        inputs,
        context,
        logger);

    const decision = await handleVersion.run();
    setOutputsFrom(decision);
    await writeSummary(decision, logger);
};

run().catch(ex => setFailed(ex instanceof Error ? ex : String(ex)));
