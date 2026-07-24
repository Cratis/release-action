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
     * Whether a release already exists for a tag. This is the definitive idempotency check - GitHub rejects a
     * second release for the same tag, and a version we already published must never be released twice.
     */
    existsForTag(tag: string): Promise<boolean>;

    /**
     * Whether a release already points at a commit.
     */
    existsForSha(sha: string): Promise<boolean>;

    /**
     * Creates the release.
     */
    create(release: Release): Promise<void>;
}
