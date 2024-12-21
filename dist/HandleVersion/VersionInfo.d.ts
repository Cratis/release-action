import semver from 'semver';
export declare class VersionInfo {
    readonly version: semver.SemVer;
    readonly isMajor: boolean;
    readonly isMinor: boolean;
    readonly isPatch: boolean;
    readonly isRelease: boolean;
    readonly isPrerelease: boolean;
    readonly isIsolatedForPullRequest: boolean;
    readonly isValid: boolean;
    static invalid: VersionInfo;
    static noRelease: VersionInfo;
    constructor(version: semver.SemVer, isMajor: boolean, isMinor: boolean, isPatch: boolean, isRelease: boolean, isPrerelease: boolean, isIsolatedForPullRequest: boolean, isValid: boolean);
}
