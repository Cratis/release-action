import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

describe('when finding what the release for a tag points at with a release for the tag', () => {
    let result: string | undefined;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.getReleaseByTag.resolves({ data: { tag_name: 'v1.2.4', target_commitish: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' } });

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());
        result = await releases.targetOf('v1.2.4');
    });

    it('should find the commit the release points at', () => {
        (result as string).should.equal('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    });
});
