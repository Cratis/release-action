import { beforeEach, describe, it } from 'vitest';

import { HandleRelease } from '../../HandleRelease';
import { Release } from '../../Release';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { someIssues } from '../../specs/someIssues';
import { StubbedReleases, someReleases } from '../../specs/someReleases';
import { aDecisionToRelease, aRecordedDecision } from '../given/a_recorded_decision';

// With no notes of our own, the release should still get a body - GitHub generates it.
describe('when running the post step with a decision that has no release notes', () => {
    let created: Release;

    beforeEach(async () => {
        const releases: StubbedReleases = someReleases();

        await new HandleRelease(
            releases,
            aRecordedDecision(aDecisionToRelease({ releaseNotes: '' })),
            someIssues(),
            anActionContext(),
            new RecordingLogger()).run();

        created = releases.create.firstCall.args[0];
    });

    it('should ask GitHub to generate the release notes', () => {
        created.generateNotes.should.be.true;
    });
});
