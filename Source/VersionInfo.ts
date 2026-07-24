import { SemVer } from 'semver';

/**
 * Represents the outcome of working out which version - if any - a pull request should produce.
 */
export class VersionInfo {

    /**
     * Nothing should be released.
     */
    static readonly noRelease = new VersionInfo(undefined, false, '');

    private constructor(
        readonly version: SemVer | undefined,
        readonly isIsolatedForPullRequest: boolean,
        readonly previousVersion: string) {
    }

    /**
     * Something should be released, with the given version, bumped from `previousVersion` (empty when there is
     * no meaningful predecessor, such as a prerelease derived from a branch name).
     */
    static releaseOf(version: SemVer, isIsolatedForPullRequest: boolean, previousVersion = ''): VersionInfo {
        return new VersionInfo(version, isIsolatedForPullRequest, previousVersion);
    }

    get isRelease(): boolean {
        return this.version !== undefined;
    }

    get isPrerelease(): boolean {
        return (this.version?.prerelease.length ?? 0) > 0;
    }
}
