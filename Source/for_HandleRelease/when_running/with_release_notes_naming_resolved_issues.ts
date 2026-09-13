import { beforeEach, describe, it } from 'vitest';

import { HandleRelease } from '../../HandleRelease';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { StubbedIssues, someIssues } from '../../specs/someIssues';
import { someReleases } from '../../specs/someReleases';
import { aDecisionToRelease, aRecordedDecision } from '../given/a_recorded_decision';

describe('when running the post step with release notes naming resolved issues', () => {
    let issues: StubbedIssues;

    beforeEach(async () => {
        issues = someIssues();

        await new HandleRelease(
            someReleases(),
            aRecordedDecision(aDecisionToRelease({ releaseNotes: '- Fixed the thing (#123)\n- And another (#456)\n- Mentions #789 in passing' })),
            issues,
            anActionContext(),
            new RecordingLogger()).run();
    });

    it('should close every issue the notes say the release resolves', () => {
        issues.close.callCount.should.equal(2);
    });

    it('should close the first of them', () => {
        issues.close.firstCall.args[0].should.equal(123);
    });

    it('should close the second of them', () => {
        issues.close.secondCall.args[0].should.equal(456);
    });

    it('should say which release closed it', () => {
        issues.close.firstCall.args[1].should.contain('v1.2.4');
    });
});
