import { beforeEach, describe, it } from 'vitest';

import { HandleRelease } from '../../HandleRelease';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { someIssues } from '../../specs/someIssues';
import { StubbedReleases, someReleases } from '../../specs/someReleases';
import { aDecisionToRelease, aRecordedDecision } from '../given/a_recorded_decision';

describe('when running the post step with a decision not to create a release', () => {
    let releases: StubbedReleases;
    let logger: RecordingLogger;

    beforeEach(async () => {
        releases = someReleases();
        logger = new RecordingLogger();

        await new HandleRelease(
            releases,
            aRecordedDecision(aDecisionToRelease({ shouldCreateRelease: false, reason: 'batched' })),
            someIssues(),
            anActionContext(),
            logger).run();
    });

    it('should not create a release', () => {
        releases.create.called.should.be.false;
    });

    it('should include the recorded reason in the log', () => {
        logger.messages.should.include('The main step decided that no GitHub release should be created for this run (reason: batched).');
    });
});

describe('when a legacy decision to skip has no recorded reason', () => {
    let logger: RecordingLogger;

    beforeEach(async () => {
        logger = new RecordingLogger();
        const decision = aDecisionToRelease({ shouldCreateRelease: false });
        Reflect.deleteProperty(decision, 'reason');
        await new HandleRelease(someReleases(), aRecordedDecision(decision), someIssues(), anActionContext(), logger).run();
    });

    it('should preserve the existing message without an empty reason', () => {
        logger.messages.should.include('The main step decided that no GitHub release should be created for this run.');
    });
});
