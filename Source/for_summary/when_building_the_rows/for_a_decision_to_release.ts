import { beforeEach, describe, it } from 'vitest';

import { summaryRowsFor } from '../../summary';
import { aDecisionToRelease } from '../../for_HandleRelease/given/a_recorded_decision';

describe('when building the summary rows for a decision to release', () => {
    let rows: Map<string, string>;

    beforeEach(() => {
        rows = new Map(summaryRowsFor(aDecisionToRelease()));
    });

    it('should show that it will publish', () => {
        rows.get('Should publish')?.should.equal('yes');
    });

    it('should show the version', () => {
        rows.get('Version')?.should.equal('1.2.4');
    });

    it('should show the previous version', () => {
        rows.get('Previous version')?.should.equal('1.2.3');
    });

    it('should show the reason', () => {
        rows.get('Reason')?.should.equal('release');
    });
});
