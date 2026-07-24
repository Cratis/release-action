import { beforeEach, describe, it } from 'vitest';

import { ReleaseDecision } from '../../ReleaseDecision';
import { aPullRequest } from '../../specs/aPullRequest';
import { noInputs, the_main_step } from '../given/the_main_step';

describe('when running the main step for a merged pull request with a custom tag prefix', () => {
    let decision: ReleaseDecision;

    beforeEach(async () => {
        decision = await new the_main_step(
            aPullRequest({
                state: 'closed',
                merged: true,
                merged_at: '2026-07-23T10:00:00Z',
                labels: [{ name: 'minor' }]
            }),
            { ...noInputs, tagPrefix: 'release-' }).run();
    });

    it('should build the tag with the custom prefix', () => {
        decision.tag.should.equal('release-1.3.0');
    });

    it('should carry the previous version', () => {
        decision.previousVersion.should.equal('1.2.3');
    });
});
