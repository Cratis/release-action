import sinon from 'sinon';
import { beforeEach, describe, it } from 'vitest';

import { HandleRelease } from '../../HandleRelease';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { StubbedIssues, someIssues } from '../../specs/someIssues';
import { StubbedReleases, someReleases } from '../../specs/someReleases';
import { aDecisionToRelease, aRecordedDecision } from '../given/a_recorded_decision';

/**
 * The release is the thing that had to happen. An issue left open because the API refused is untidy; a step that
 * fails after publishing makes the run look as though nothing shipped, which is worse and is what people act on.
 */
describe('when running the post step with an issue that cannot be closed', () => {
    let issues: StubbedIssues;
    let releases: StubbedReleases;

    beforeEach(async () => {
        issues = someIssues();
        issues.close = sinon.stub();
        issues.close.onFirstCall().rejects(new Error('Forbidden'));
        issues.close.onSecondCall().resolves(true);
        releases = someReleases();

        await new HandleRelease(
            releases,
            aRecordedDecision(aDecisionToRelease({ releaseNotes: '- One (#123)\n- Two (#456)' })),
            issues,
            anActionContext(),
            new RecordingLogger()).run();
    });

    it('should not fail the step', () => {
        releases.create.calledOnce.should.be.true;
    });

    it('should still close the issues it can', () => {
        issues.close.callCount.should.equal(2);
    });
});
