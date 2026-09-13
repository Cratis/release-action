import { beforeEach, describe, it } from 'vitest';

import { HandleRelease } from '../../HandleRelease';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { StubbedIssues, someIssues } from '../../specs/someIssues';
import { StubbedReleases, someReleases } from '../../specs/someReleases';
import { aDecisionToRelease, aRecordedDecision } from '../given/a_recorded_decision';

describe('when running the post step with closing resolved issues turned off', () => {
    let issues: StubbedIssues;
    let releases: StubbedReleases;

    beforeEach(async () => {
        issues = someIssues();
        releases = someReleases();

        await new HandleRelease(
            releases,
            aRecordedDecision(aDecisionToRelease({ releaseNotes: '- Fixed the thing (#123)' })),
            issues,
            anActionContext(),
            new RecordingLogger(),
            false).run();
    });

    it('should close nothing', () => {
        issues.close.called.should.be.false;
    });

    it('should still create the release', () => {
        releases.create.calledOnce.should.be.true;
    });
});
