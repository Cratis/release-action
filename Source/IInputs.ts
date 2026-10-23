import { IReleaseOptions } from './IReleaseOptions';

/**
 * Defines the inputs the action was invoked with.
 */
export interface IInputs extends IReleaseOptions {
    readonly gitHubToken: string;
    readonly version: string;

    /** Minutes to wait from the oldest pending merge. Absent or zero preserves single-PR behavior. */
    readonly releaseWindow?: number;
    readonly hotfixLabels?: readonly string[];
    readonly releaseNotes: string;

    /**
     * Whether to close the issues the release notes name as resolved.
     */
    readonly closeResolvedIssues: boolean;
}
