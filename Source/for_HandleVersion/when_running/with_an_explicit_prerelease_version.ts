import { beforeEach, describe, it } from 'vitest';

import { ReleaseDecision } from '../../ReleaseDecision';
import { aPullRequest } from '../../specs/aPullRequest';
import { noInputs, the_main_step } from '../given/the_main_step';

describe('when running the main step with an explicit prerelease version', () => {
    let decision: ReleaseDecision;

    beforeEach(async () => {
        decision = await new the_main_step(
            aPullRequest(),
            { ...noInputs, version: '2.5.0-beta.1', releaseNotes: 'Beta notes' }).run();
    });

    it('should be a prerelease', () => {
        decision.isPrerelease.should.be.true;
    });
});
