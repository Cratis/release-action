import { beforeEach, describe, it } from 'vitest';

import { nothingToRelease } from '../../ReleaseDecision';
import { summaryRowsFor } from '../../summary';

describe('when building the summary rows for nothing to release', () => {
    let rows: Map<string, string>;

    beforeEach(() => {
        rows = new Map(summaryRowsFor(nothingToRelease));
    });

    it('should show that it will not publish', () => {
        rows.get('Should publish')?.should.equal('no');
    });

    it('should show a dash for the absent version', () => {
        rows.get('Version')?.should.equal('—');
    });
});
