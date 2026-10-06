import { beforeEach, describe, it } from 'vitest';

import { HandleRelease } from '../../HandleRelease';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { someIssues } from '../../specs/someIssues';
import { StubbedReleases, someReleases } from '../../specs/someReleases';
import { aDecisionToRelease, aRecordedDecision } from '../given/a_recorded_decision';

// A parallel job for the same commit got there first - the work is done, so the run carries on.
describe('when running the post step with a release for the tag that points at the same commit', () => {
    let releases: StubbedReleases;
    let thrown: unknown;

    beforeEach(async () => {
        releases = someReleases();
        releases.targetOf.resolves('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

        try {
            await new HandleRelease(
                releases,
                aRecordedDecision(aDecisionToRelease()),
                someIssues(),
                anActionContext(),
                new RecordingLogger()).run();
        } catch (ex) {
            thrown = ex;
        }
    });

    it('should not create a duplicate release', () => {
        releases.create.called.should.be.false;
    });

    it('should not fail', () => {
        (thrown === undefined).should.be.true;
    });
});
