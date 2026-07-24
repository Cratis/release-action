import { ReleaseDecision } from './ReleaseDecision';

/**
 * Defines how the main step hands its decision over to the post step.
 */
export interface IReleaseDecisions {
    /**
     * Records the decision made by the main step.
     */
    record(decision: ReleaseDecision): void;

    /**
     * Reads back the recorded decision, or `undefined` when the main step never got as far as recording one -
     * in which case nothing may be released.
     */
    read(): ReleaseDecision | undefined;
}
