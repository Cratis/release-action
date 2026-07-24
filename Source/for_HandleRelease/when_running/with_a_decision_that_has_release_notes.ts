import { beforeEach, describe, it } from 'vitest';

import { HandleRelease } from '../../HandleRelease';
import { Release } from '../../Release';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { StubbedReleases, someReleases } from '../../specs/someReleases';
import { aDecisionToRelease, aRecordedDecision } from '../given/a_recorded_decision';

describe('when running the post step with a decision that has release notes', () => {
    let created: Release;

    beforeEach(async () => {
        const releases: StubbedReleases = someReleases();

        await new HandleRelease(
            releases,
            aRecordedDecision(aDecisionToRelease({ releaseNotes: 'The actual notes' })),
            anActionContext(),
            new RecordingLogger()).run();

        created = releases.create.firstCall.args[0];
    });

    it('should not ask GitHub to generate the release notes', () => {
        created.generateNotes.should.be.false;
    });
});
