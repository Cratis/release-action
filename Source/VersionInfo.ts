import semver from 'semver';


export class VersionInfo {
    static invalid: VersionInfo = new VersionInfo(undefined!, false, false, false, false, false, false, false);
    static noRelease: VersionInfo = new VersionInfo(undefined!, false, false, false, false, false, false, true);

    constructor(
        readonly version: semver.SemVer,
        readonly isMajor: boolean,
        readonly isMinor: boolean,
        readonly isPatch: boolean,
        readonly isRelease: boolean,
        readonly isPrerelease: boolean,
        readonly isIsolatedForPullRequest: boolean,
        readonly isValid: boolean) {
    }
}
