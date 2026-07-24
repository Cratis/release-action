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
    const octokit = new Octokit({ auth: inputs.gitHubToken || undefined });
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
