import { beforeEach, describe, it } from 'vitest';

import { HandleRelease } from '../../HandleRelease';
import { Release } from '../../Release';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { someIssues } from '../../specs/someIssues';
import { StubbedReleases, someReleases } from '../../specs/someReleases';
import { aDecisionToRelease, aRecordedDecision } from '../given/a_recorded_decision';

// A description left as the bare template says nothing a reader would see, so it counts as no notes at all.
describe('when running the post step with release notes holding only a comment', () => {
    let created: Release;

    beforeEach(async () => {
        const releases: StubbedReleases = someReleases();

        await new HandleRelease(
            releases,
            aRecordedDecision(aDecisionToRelease({ releaseNotes: '<!-- Describe the change for the release notes. -->\n' })),
            someIssues(),
            anActionContext(),
            new RecordingLogger()).run();

        created = releases.create.firstCall.args[0];
    });

    it('should ask GitHub to generate the release notes', () => {
        created.generateNotes.should.be.true;
    });
});
