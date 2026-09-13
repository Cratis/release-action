import { IReleaseOptions } from './IReleaseOptions';

/**
 * Defines the inputs the action was invoked with.
 */
export interface IInputs extends IReleaseOptions {
    readonly gitHubToken: string;
    readonly version: string;
    readonly releaseNotes: string;

    /**
     * Whether to close the issues the release notes name as resolved.
     */
    readonly closeResolvedIssues: boolean;
}
