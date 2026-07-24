import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

describe('when checking whether a release exists for a sha that one targets', () => {
    const sha = 'abcabcabcabcabcabcabcabcabcabcabcabcabca';
    let result: boolean;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.setReleases([
            { tag_name: 'v1.0.0', target_commitish: 'somethingelse', draft: false, prerelease: false },
            { tag_name: 'v1.2.3', target_commitish: sha, draft: false, prerelease: false }
        ]);

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());
        result = await releases.existsForSha(sha);
    });

    it('should exist', () => {
        result.should.be.true;
    });
});
