import { summary } from '@actions/core';

import { ILogger } from './ILogger';
import { ReleaseDecision } from './ReleaseDecision';

const yesNo = (value: boolean): string => (value ? 'yes' : 'no');
const orDash = (value: string): string => (value !== '' ? value : '—');

/**
 * The rows of the decision table, as label/value pairs. Kept pure and separate from writing it, so the exact
 * wording can be asserted without any GitHub environment.
 */
export const summaryRowsFor = (decision: ReleaseDecision): [string, string][] => [
    ['Should publish', yesNo(decision.shouldPublish)],
    ['Create release', yesNo(decision.shouldCreateRelease)],
    ['Version', orDash(decision.version)],
    ['Tag', orDash(decision.tag)],
    ['Previous version', orDash(decision.previousVersion)],
    ['Prerelease', yesNo(decision.isPrerelease)],
    ['Isolated for pull request', yesNo(decision.isIsolatedForPullRequest)]
];

/**
 * Writes the decision to the GitHub step summary, so anyone looking at the run can see at a glance what the
 * action decided and why. Best-effort - a missing summary sink or a write failure must never fail the action.
 */
export const writeSummary = async (decision: ReleaseDecision, logger: ILogger): Promise<void> => {
    if (!process.env.GITHUB_STEP_SUMMARY) return;

    try {
        const rows = summaryRowsFor(decision).map(([label, value]) => [{ data: label, header: true }, value]);

        await summary
            .addHeading('Release', 3)
            .addTable(rows)
            .write();
    } catch (ex) {
        logger.warn('Could not write the job summary.');
        logger.warn(ex);
    }
};
