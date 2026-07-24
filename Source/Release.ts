/**
 * Represents a GitHub release that is about to be created.
 */
export type Release = {
    tag: string;
    name: string;
    notes: string;

    /**
     * Whether GitHub should auto-generate the release notes. Used when no notes were supplied, so the release
     * still gets a meaningful body instead of an empty one.
     */
    generateNotes: boolean;

    isPrerelease: boolean;
    targetCommitish: string;
};
