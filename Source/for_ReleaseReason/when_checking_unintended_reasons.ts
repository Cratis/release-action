import { describe, it } from 'vitest';

import { unintendedReasons } from '../ReleaseReason';

// A workflow fails the run for exactly these reasons. `no-release` must never join them - it is a decision,
// not an omission, and failing on it would alarm on every deliberate no-release merge.
describe('when checking unintended reasons', () => {
    it('should flag no-label as unintended', () => {
        unintendedReasons.should.contain('no-label');
    });

    it('should flag error as unintended', () => {
        unintendedReasons.should.contain('error');
    });

    it('should not flag no-release as unintended', () => {
        unintendedReasons.should.not.contain('no-release');
    });
});
