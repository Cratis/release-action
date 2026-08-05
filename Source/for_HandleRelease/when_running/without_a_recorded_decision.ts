import { beforeEach, describe, it } from 'vitest';

import { HandleRelease } from '../../HandleRelease';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { someIssues } from '../../specs/someIssues';
import { StubbedReleases, someReleases } from '../../specs/someReleases';
import { aRecordedDecision } from '../given/a_recorded_decision';

// The post step fails closed: if the main step never got as far as deciding, nothing is released.
describe('when running the post step without a recorded decision', () => {
    let releases: StubbedReleases;

    beforeEach(async () => {
        releases = someReleases();

        await new HandleRelease(
            releases,
            aRecordedDecision(undefined),
            someIssues(),
            anActionContext(),
            new RecordingLogger()).run();
    });

    it('should not create a release', () => {
        releases.create.called.should.be.false;
    });
});
