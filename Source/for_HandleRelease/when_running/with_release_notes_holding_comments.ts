import { beforeEach, describe, it } from 'vitest';

import { HandleRelease } from '../../HandleRelease';
import { Release } from '../../Release';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { StubbedIssues, someIssues } from '../../specs/someIssues';
import { StubbedReleases, someReleases } from '../../specs/someReleases';
import { aDecisionToRelease, aRecordedDecision } from '../given/a_recorded_decision';

// The pull request template's guidance lives in a comment authors often leave in place. The release page hides
// it, but the published body would keep it - and an issue named only there is not one the release says it delivers.
describe('when running the post step with release notes holding comments', () => {
    let issues: StubbedIssues;
    let created: Release;

    beforeEach(async () => {
        const releases: StubbedReleases = someReleases();
        issues = someIssues();

        await new HandleRelease(
            releases,
            aRecordedDecision(aDecisionToRelease({
                releaseNotes: '<!--\nEnd each bullet with the issue it delivers, like (#7).\n-->\n## Fixed\n\n- Fixed the thing (#123)\n'
            })),
            issues,
            anActionContext(),
            new RecordingLogger()).run();

        created = releases.create.firstCall.args[0];
    });

    it('should publish the notes without the comment', () => {
        created.notes.should.equal('## Fixed\n\n- Fixed the thing (#123)\n');
    });

    it('should close only the issue the published notes name', () => {
        issues.close.callCount.should.equal(1);
        issues.close.firstCall.args[0].should.equal(123);
    });
});
