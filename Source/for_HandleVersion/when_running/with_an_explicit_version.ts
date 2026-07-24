import { beforeEach, describe, it } from 'vitest';

import { ReleaseDecision } from '../../ReleaseDecision';
import { aPullRequest } from '../../specs/aPullRequest';
import { noInputs, the_main_step } from '../given/the_main_step';

// An explicit `version` input overrides working the version out from the pull request entirely.
describe('when running the main step with an explicit version', () => {
    let decision: ReleaseDecision;

    beforeEach(async () => {
        decision = await new the_main_step(
            aPullRequest(),
            { ...noInputs, version: '2.5.0', releaseNotes: 'Handwritten notes' }).run();
    });

    it('should publish the explicit version', () => {
        decision.version.should.equal('2.5.0');
    });

    it('should tag it', () => {
        decision.tag.should.equal('v2.5.0');
    });

    it('should create a release', () => {
        decision.shouldCreateRelease.should.be.true;
    });

    it('should use the provided notes', () => {
        decision.releaseNotes.should.equal('Handwritten notes');
    });
});
