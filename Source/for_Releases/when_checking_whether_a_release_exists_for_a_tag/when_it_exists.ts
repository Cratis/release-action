import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

describe('when checking whether a release exists for a tag that exists', () => {
    let result: boolean;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.getReleaseByTag.resolves({ data: { tag_name: 'v1.2.4' } });

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());
        result = await releases.existsForTag('v1.2.4');
    });

    it('should exist', () => {
        result.should.be.true;
    });
});
