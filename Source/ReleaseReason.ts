/**
 * Why the action arrived at the decision it did - surfaced as the `reason` output.
 *
 * `should-publish` on its own cannot be acted on: a run that publishes nothing is sometimes exactly right
 * (a commit pushed straight to the branch, a Dependabot merge) and sometimes a mistake that costs a release
 * (a merged pull request nobody labeled). Both look identical as a boolean, and both report a green run. The
 * reason is what lets a workflow fail loudly on the second without crying wolf over the first.
 */
export type ReleaseReason = ReleasedReason | NotReleasedReason;

/**
 * The reasons something is released.
 */
export type ReleasedReason =
    /**
     * A release of the repository is being cut.
     */
    | 'release'

    /**
     * A prerelease artifact belonging to a pull request is being published. No GitHub release is created.
     */
    | 'prerelease';

/**
 * The reasons nothing is released.
 */
export type NotReleasedReason =
    /**
     * No merged pull request could be found for the commit - a commit pushed straight to the branch rather
     * than merged through a pull request. Expected, and not a problem.
     */
    | 'no-pull-request'

    /**
     * The pull request was closed without ever being merged. Expected, and not a problem.
     */
    | 'not-merged'

    /**
     * The pull request was merged but carries no major, minor or patch label, so no version could be worked
     * out. This is the mistake worth failing a workflow over - the merge silently produced no release.
     */
    | 'no-label'

    /**
     * The pull request was raised by Dependabot, which never produces a release. Expected.
     */
    | 'dependabot'

    /**
     * A release already exists for this commit - the run is a repeat of one that already released. Expected,
     * and the reason a re-run cannot publish a second, higher version from the same commit.
     */
    | 'already-released'

    /**
     * An open pull request that yields no prerelease - it is not a draft and its branch is not named after a
     * version. Expected.
     */
    | 'no-prerelease-version'

    /**
     * The `version` input was left at the `0.0.0` placeholder the publish templates ship, so a manual run
     * that nobody filled in released nothing. Expected.
     */
    | 'placeholder-version'

    /**
     * Working out the version failed. The action fails closed and releases nothing, which is safe - but it is
     * indistinguishable from a deliberate no-release unless the reason says so. Worth failing a workflow over.
     */
    | 'error';

/**
 * The reasons that mean something went wrong rather than something was deliberately skipped. A workflow that
 * wants to turn a silent non-release into a visible failure should key off these.
 */
export const unintendedReasons: readonly NotReleasedReason[] = ['no-label', 'error'];
