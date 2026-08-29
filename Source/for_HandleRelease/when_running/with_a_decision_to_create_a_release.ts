import { beforeEach, describe, it } from 'vitest';

import { HandleRelease } from '../../HandleRelease';
import { Release } from '../../Release';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { anActionContext } from '../../specs/anActionContext';
import { someIssues } from '../../specs/someIssues';
import { StubbedReleases, someReleases } from '../../specs/someReleases';
import { aDecisionToRelease, aRecordedDecision } from '../given/a_recorded_decision';

describe('when running the post step with a decision to create a release', () => {
    let releases: StubbedReleases;
    let created: Release;

    beforeEach(async () => {
        releases = someReleases();

        await new HandleRelease(
            releases,
            aRecordedDecision(aDecisionToRelease()),
            someIssues(),
            anActionContext(),
            new RecordingLogger()).run();

        created = releases.create.firstCall.args[0];
    });

    it('should create the release', () => {
        releases.create.calledOnce.should.be.true;
    });

    it('should tag it with the version', () => {
        created.tag.should.equal('v1.2.4');
    });

    it('should use the pull request body as release notes', () => {
        created.notes.should.equal('The release notes');
    });

    it('should point it at the merge commit rather than at the sha of the event', () => {
        created.targetCommitish.should.equal('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    });
});
