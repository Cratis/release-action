import { beforeEach, describe, it } from 'vitest';

import { ReleaseDecision } from '../../ReleaseDecision';
import { aPullRequest } from '../../specs/aPullRequest';
import { noInputs, the_main_step } from '../given/the_main_step';

// `0.0.0` is the placeholder default carried by the `workflow_dispatch` inputs of the publish templates. A
// manual run left at that default must not cut a release - not even for a pull request that would otherwise
// produce one.
describe('when running the main step with the placeholder version', () => {
    let decision: ReleaseDecision;

    beforeEach(async () => {
        decision = await new the_main_step(
            aPullRequest({
                state: 'closed',
                merged: true,
                merged_at: '2026-07-23T10:00:00Z',
                labels: [{ name: 'minor' }]
            }),
            { ...noInputs, version: '0.0.0' }).run();
    });

    it('should not publish', () => {
        decision.shouldPublish.should.be.false;
    });

    it('should not create a release', () => {
        decision.shouldCreateRelease.should.be.false;
    });

    it('should not produce a version', () => {
        decision.version.should.equal('');
    });

    it('should say that the version was the placeholder', () => {
        decision.reason.should.equal('placeholder-version');
    });
});
