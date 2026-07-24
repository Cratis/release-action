import { IReleaseDecisions } from '../../IReleaseDecisions';
import { ReleaseDecision } from '../../ReleaseDecision';

/**
 * A release decision store holding whatever the main step is supposed to have recorded.
 */
export const aRecordedDecision = (decision: ReleaseDecision | undefined): IReleaseDecisions => ({
    record: () => { },
    read: () => decision
});

export const aDecisionToRelease = (overrides: Partial<ReleaseDecision> = {}): ReleaseDecision => ({
    shouldPublish: true,
    shouldCreateRelease: true,
    version: '1.2.4',
    tag: 'v1.2.4',
    isPrerelease: false,
    isIsolatedForPullRequest: false,
    releaseNotes: 'The release notes',
    previousVersion: '1.2.3',
    targetCommitish: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ...overrides
});
