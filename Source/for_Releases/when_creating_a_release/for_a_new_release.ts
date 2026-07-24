import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

describe('when creating a new release', () => {
    let request: { tag_name: string; name: string; body: string; generate_release_notes: boolean; prerelease: boolean; target_commitish: string };

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());
        await releases.create({
            tag: 'v1.2.4',
            name: 'Release v1.2.4',
            notes: 'The notes',
            generateNotes: false,
            isPrerelease: false,
            targetCommitish: 'abcabcabcabcabcabcabcabcabcabcabcabcabca'
        });

        request = fake.createRelease.firstCall.args[0];
    });

    it('should tag the release', () => {
        request.tag_name.should.equal('v1.2.4');
    });

    it('should use the notes as the release body', () => {
        request.body.should.equal('The notes');
    });

    it('should target the requested commit', () => {
        request.target_commitish.should.equal('abcabcabcabcabcabcabcabcabcabcabcabcabca');
    });
});
