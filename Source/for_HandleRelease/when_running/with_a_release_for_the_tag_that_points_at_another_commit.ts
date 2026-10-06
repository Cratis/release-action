import { beforeEach, describe, it } from 'vitest';

import { HandleRelease } from '../../HandleRelease';
import { VersionClaimedByAnotherCommit } from '../../VersionClaimedByAnotherCommit';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { StubbedIssues, someIssues } from '../../specs/someIssues';
import { StubbedReleases, someReleases } from '../../specs/someReleases';
import { aDecisionToRelease, aRecordedDecision } from '../given/a_recorded_decision';

// A concurrent run worked out the same version and released it for its own commit first. This run lost the
// version, and reporting success would let everything downstream publish under a version that is not its own.
describe('when running the post step with a release for the tag that points at another commit', () => {
    let releases: StubbedReleases;
    let issues: StubbedIssues;
    let thrown: unknown;

    beforeEach(async () => {
        releases = someReleases();
        releases.targetOf.resolves('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
        issues = someIssues();

        try {
            await new HandleRelease(
                releases,
                aRecordedDecision(aDecisionToRelease({ releaseNotes: '- Fixed the thing (#123)' })),
                issues,
                anActionContext(),
                new RecordingLogger()).run();
        } catch (ex) {
            thrown = ex;
        }
    });

    it('should fail because the version is claimed by another commit', () => {
        (thrown as VersionClaimedByAnotherCommit).should.be.instanceOf(VersionClaimedByAnotherCommit);
    });

    it('should not create a release', () => {
        releases.create.called.should.be.false;
    });

    it('should not close the issues its notes name', () => {
        issues.close.called.should.be.false;
    });
});
