/**
 * The error raised when the release this run was about to create already exists for a different commit.
 *
 * Two runs that start close together both read the same latest release and both work out the same next version.
 * Whichever creates its release first owns that version; the other has lost the race. Its artifacts would carry a
 * version whose release points at someone else's commit and notes, so it must fail rather than report success.
 * Re-running it works the version out again from the now-higher latest release.
 */
export class VersionClaimedByAnotherCommit extends Error {

    constructor(
        readonly tag: string,
        readonly claimedBy: string,
        readonly targetCommitish: string) {
        super(
            `The release '${tag}' already exists for commit '${claimedBy}', not for '${targetCommitish}' - a concurrent run claimed this version first. ` +
            `Nothing may be published as '${tag}' from this commit; re-run the workflow to release it under the next version.`);
        this.name = 'VersionClaimedByAnotherCommit';
    }
}
