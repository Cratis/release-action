import { SemVer } from 'semver';

import { Release } from './Release';

/**
 * Defines the GitHub releases of the repository the action is running for.
 */
export interface IReleases {
    /**
     * Gets the highest version that has been released, defaulting to `0.0.0` when nothing has been released.
     */
    getLatestReleaseVersion(): Promise<SemVer>;

    /**
     * The commit the release for a tag points at, or undefined when there is no release for the tag. This is the
     * definitive idempotency check - GitHub rejects a second release for the same tag, and a version already
     * published must never be released twice. The commit tells a re-run, which finds its own release, apart from
     * a run that lost the version to another commit.
     */
    targetOf(tag: string): Promise<string | undefined>;

    /**
     * Whether a release already points at a commit.
     */
    existsForSha(sha: string): Promise<boolean>;

    /**
     * Creates the release. When a release for the tag turns out to exist already, it is left alone if it points
     * at the same commit, and `VersionClaimedByAnotherCommit` is thrown if it points at another.
     */
    create(release: Release): Promise<void>;
}
