/**
 * Defines the issues of the repository the action is running for.
 */
export interface IIssues {
    /**
     * Closes an issue and says why, doing nothing when it is already closed.
     * @param number The number of the issue to close.
     * @param comment The comment to leave before closing.
     * @returns Whether the issue was closed by this call.
     */
    close(number: number, comment: string): Promise<boolean>;
}
