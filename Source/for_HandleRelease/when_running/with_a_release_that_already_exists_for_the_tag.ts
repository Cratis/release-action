import { beforeEach, describe, it } from 'vitest';

import { HandleRelease } from '../../HandleRelease';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { someIssues } from '../../specs/someIssues';
import { StubbedReleases, someReleases } from '../../specs/someReleases';
import { aDecisionToRelease, aRecordedDecision } from '../given/a_recorded_decision';

describe('when running the post step for a version that has already been released', () => {
    let releases: StubbedReleases;

    beforeEach(async () => {
        releases = someReleases();
        releases.existsForTag.resolves(true);

        await new HandleRelease(
            releases,
            aRecordedDecision(aDecisionToRelease()),
            someIssues(),
            anActionContext(),
            new RecordingLogger()).run();
    });

    it('should not create a duplicate release', () => {
        releases.create.called.should.be.false;
    });
});
