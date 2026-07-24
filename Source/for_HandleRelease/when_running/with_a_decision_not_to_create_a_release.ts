import { beforeEach, describe, it } from 'vitest';

import { HandleRelease } from '../../HandleRelease';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { StubbedReleases, someReleases } from '../../specs/someReleases';
import { aDecisionToRelease, aRecordedDecision } from '../given/a_recorded_decision';

describe('when running the post step with a decision not to create a release', () => {
    let releases: StubbedReleases;

    beforeEach(async () => {
        releases = someReleases();

        await new HandleRelease(
            releases,
            aRecordedDecision(aDecisionToRelease({ shouldCreateRelease: false })),
            anActionContext(),
            new RecordingLogger()).run();
    });

    it('should not create a release', () => {
        releases.create.called.should.be.false;
    });
});
