import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// GitHub answers a missing tag with 404 - that is a definitive "no", not an error to propagate.
describe('when checking whether a release exists for a tag that does not exist', () => {
    let result: boolean;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.getReleaseByTag.rejects({ status: 404 });

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());
        result = await releases.existsForTag('v1.2.4');
    });

    it('should not exist', () => {
        result.should.be.false;
    });
});
