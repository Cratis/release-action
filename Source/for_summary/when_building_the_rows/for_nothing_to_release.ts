import { beforeEach, describe, it } from 'vitest';

import { nothingToRelease } from '../../ReleaseDecision';
import { NotReleasedReason } from '../../ReleaseReason';
import { summaryRowsFor } from '../../summary';

describe('when building the summary rows for nothing to release', () => {
    let rows: Map<string, string>;

    beforeEach(() => {
        rows = new Map(summaryRowsFor(nothingToRelease('no-label')));
    });

    it('should show that it will not publish', () => {
        rows.get('Should publish')?.should.equal('no');
    });

    it('should show a dash for the absent version', () => {
        rows.get('Version')?.should.equal('—');
    });

    it('should show the reason', () => {
        rows.get('Reason')?.should.equal('no-label');
    });

    it('should not add an explanation for existing callers', () => {
        rows.has('Explanation').should.be.false;
    });
});

const skippedBatches: [NotReleasedReason, string][] = [
    ['batched', 'Pending PRs #1, #2: oldest merge 2026-06-01T11:50:00.000Z; the 60-minute release window elapses at 2026-06-01T12:50:00.000Z.'],
    ['nothing-pending', 'Nothing is pending for release since the latest stable release tag.'],
    ['no-label', 'Pending PRs #1, #2: none carries a release intent - nothing will be released.']
];

for (const [reason, explanation] of skippedBatches) {
    describe(`when building the summary rows for a batch skipped with ${reason}`, () => {
        let rows: Map<string, string>;

        beforeEach(() => {
            rows = new Map(summaryRowsFor({ ...nothingToRelease(reason), pullRequests: [1, 2], explanation }));
        });

        it('should show the recorded explanation alongside the reason', () => {
            rows.get('Reason')?.should.equal(reason);
            rows.get('Explanation')?.should.equal(explanation);
        });
    });
}
