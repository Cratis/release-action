import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// GitHub answers a missing tag with 404 - that is a definitive "no release", not an error to propagate.
describe('when finding what the release for a tag points at without a release for the tag', () => {
    let result: string | undefined;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.getReleaseByTag.rejects({ status: 404 });

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());
        result = await releases.targetOf('v1.2.4');
    });

    it('should find nothing', () => {
        (result === undefined).should.be.true;
    });
});
