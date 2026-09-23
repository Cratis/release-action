import { beforeEach, describe, it } from 'vitest';

import { HandleRelease } from '../../HandleRelease';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { StubbedIssues, someIssues } from '../../specs/someIssues';
import { someReleases } from '../../specs/someReleases';
import { aDecisionToRelease, aRecordedDecision } from '../given/a_recorded_decision';

describe('when running the post step with release notes naming no issues', () => {
    let issues: StubbedIssues;

    beforeEach(async () => {
        issues = someIssues();

        await new HandleRelease(
            someReleases(),
            aRecordedDecision(aDecisionToRelease({ releaseNotes: '- Fixed the thing' })),
            issues,
            anActionContext(),
            new RecordingLogger()).run();
    });

    it('should close nothing', () => {
        issues.close.called.should.be.false;
    });
});
