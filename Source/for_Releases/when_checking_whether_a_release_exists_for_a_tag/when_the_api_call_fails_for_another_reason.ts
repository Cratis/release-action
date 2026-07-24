import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// Anything other than a 404 is a real failure - swallowing it would risk creating a duplicate release, so it
// must propagate.
describe('when checking whether a release exists for a tag and the api fails for another reason', () => {
    let thrown: unknown;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.getReleaseByTag.rejects({ status: 500 });

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());

        try {
            await releases.existsForTag('v1.2.4');
        } catch (ex) {
            thrown = ex;
        }
    });

    it('should propagate the failure', () => {
        (thrown as { status: number }).status.should.equal(500);
    });
});
