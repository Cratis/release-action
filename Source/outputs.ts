import { setOutput } from '@actions/core';

import { ReleaseDecision } from './ReleaseDecision';

/**
 * Sets the outputs of the action from the decision the main step arrived at.
 */
export const setOutputsFrom = (decision: ReleaseDecision): void => {
    setOutput('version', decision.version);
    setOutput('tag', decision.tag);
    setOutput('should-publish', decision.shouldPublish);
    setOutput('prerelease', decision.isPrerelease);
    setOutput('isolated-for-pull-request', decision.isIsolatedForPullRequest);
    setOutput('previous-version', decision.previousVersion);
};
