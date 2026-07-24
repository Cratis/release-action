import { afterEach, beforeEach, describe, it } from 'vitest';

import { ReleaseDecision } from '../ReleaseDecision';
import { ReleaseDecisions } from '../ReleaseDecisions';

// When the main step never recorded a decision - because it crashed before it could - the post step reads back
// nothing and releases nothing.
describe('when reading back without a recorded decision', () => {
    const environmentVariable = 'CRATIS_RELEASE_ACTION_DECISION';
    let read: ReleaseDecision | undefined;

    beforeEach(() => {
        delete process.env[environmentVariable];
        read = new ReleaseDecisions().read();
    });

    afterEach(() => {
        delete process.env[environmentVariable];
    });

    it('should read back nothing', () => {
        (read === undefined).should.be.true;
    });
});
