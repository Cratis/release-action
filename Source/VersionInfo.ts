import { SemVer } from 'semver';

import { NotReleasedReason } from './ReleaseReason';

/**
 * Represents the outcome of working out which version - if any - a pull request should produce.
 */
export class VersionInfo {

    private constructor(
        readonly version: SemVer | undefined,
        readonly isIsolatedForPullRequest: boolean,
        readonly previousVersion: string,
        readonly reason: NotReleasedReason | undefined) {
    }

    /**
     * Nothing should be released, for the given reason. The reason travels with the outcome rather than being
     * inferred by the caller, because only the code that decided knows which of the several no-release paths
     * this was - and telling a missing label apart from a Dependabot merge is the whole point.
     */
    static noReleaseBecause(reason: NotReleasedReason): VersionInfo {
        return new VersionInfo(undefined, false, '', reason);
    }

    /**
     * Something should be released, with the given version, bumped from `previousVersion` (empty when there is
     * no meaningful predecessor, such as a prerelease derived from a branch name).
     */
    static releaseOf(version: SemVer, isIsolatedForPullRequest: boolean, previousVersion = ''): VersionInfo {
        return new VersionInfo(version, isIsolatedForPullRequest, previousVersion, undefined);
    }

    get isRelease(): boolean {
        return this.version !== undefined;
    }

    get isPrerelease(): boolean {
        return (this.version?.prerelease.length ?? 0) > 0;
    }
}
