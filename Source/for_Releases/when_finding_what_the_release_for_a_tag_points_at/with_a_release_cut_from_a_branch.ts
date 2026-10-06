import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// A release created by hand records the branch it was cut from; only its tag says which commit that was.
describe('when finding what the release for a tag points at with a release cut from a branch', () => {
    let result: string | undefined;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.getReleaseByTag.resolves({ data: { tag_name: 'v1.2.4', target_commitish: 'main' } });
        fake.getRef.resolves({ data: { object: { type: 'commit', sha: 'cccccccccccccccccccccccccccccccccccccccc' } } });

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());
        result = await releases.targetOf('v1.2.4');
    });

    it('should find the commit its tag points at', () => {
        (result as string).should.equal('cccccccccccccccccccccccccccccccccccccccc');
    });
});
