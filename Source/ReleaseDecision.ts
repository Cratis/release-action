/**
 * Everything the main step worked out about this run, handed over to the post step.
 *
 * The post step deliberately does not work any of this out for itself. Deriving the version twice - once to
 * produce the outputs and once to create the GitHub release - lets the two steps disagree, which is how a run
 * that decided against publishing could still end up creating a release.
 */
export type ReleaseDecision = {
    /**
     * Whether the caller should publish artifacts. Surfaced as the `should-publish` output.
     */
    shouldPublish: boolean;

    /**
     * Whether the post step should create a GitHub release. Publishing artifacts and cutting a GitHub release
     * are not the same thing - a prerelease publishes artifacts without a release.
     */
    shouldCreateRelease: boolean;

    version: string;

    /**
     * The tag the release is cut with - the version with the configured tag prefix (`v1.2.4`). Surfaced as the
     * `tag` output.
     */
    tag: string;

    isPrerelease: boolean;
    isIsolatedForPullRequest: boolean;
    releaseNotes: string;

    /**
     * The version this one was bumped from, or empty when there is no meaningful predecessor. Surfaced as the
     * `previous-version` output.
     */
    previousVersion: string;

    /**
     * The commit the release should point at - the merge commit on the target branch, rather than the
     * ephemeral merge commit a `pull_request` event reports as `github.sha`.
     */
    targetCommitish: string;
};

/**
 * The decision to release nothing at all. This is what every failure and every "not a release" path resolves
 * to, so that the action always fails closed.
 */
export const nothingToRelease: ReleaseDecision = {
    shouldPublish: false,
    shouldCreateRelease: false,
    version: '',
    tag: '',
    isPrerelease: false,
    isIsolatedForPullRequest: false,
    releaseNotes: '',
    previousVersion: '',
    targetCommitish: ''
};
