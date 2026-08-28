/**
 * The knobs that let a repository adopt the action without matching its exact conventions - which labels mean
 * which bump, and what a version tag is prefixed with.
 */
export interface IReleaseOptions {
    readonly tagPrefix: string;
    readonly majorLabels: readonly string[];
    readonly minorLabels: readonly string[];
    readonly patchLabels: readonly string[];
    readonly noReleaseLabels: readonly string[];
}

/**
 * The out-of-the-box conventions: `v`-prefixed tags and `major`/`minor`/`patch` labels, with `no-release`
 * marking a merge that deliberately publishes nothing.
 */
export const defaultReleaseOptions: IReleaseOptions = {
    tagPrefix: 'v',
    majorLabels: ['major'],
    minorLabels: ['minor'],
    patchLabels: ['patch'],
    noReleaseLabels: ['no-release']
};
