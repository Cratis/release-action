import { exportVariable } from '@actions/core';

import { IReleaseDecisions } from './IReleaseDecisions';
import { ReleaseDecision } from './ReleaseDecision';

/**
 * The environment variable the main step records its decision in. Variables exported through the toolkit are
 * available to every later step of the same job, including the action's own post step.
 */
const environmentVariable = 'CRATIS_RELEASE_ACTION_DECISION';

export class ReleaseDecisions implements IReleaseDecisions {

    record(decision: ReleaseDecision): void {
        exportVariable(environmentVariable, JSON.stringify(decision));
    }

    read(): ReleaseDecision | undefined {
        const recorded = process.env[environmentVariable];
        if (!recorded) return undefined;

        return JSON.parse(recorded) as ReleaseDecision;
    }
}
