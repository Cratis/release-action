import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../../Releases';
import { VersionClaimedByAnotherCommit } from '../../VersionClaimedByAnotherCommit';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { FakeOctokit, aFakeOctokit } from '../../specs/aFakeOctokit';
import { anActionContext } from '../../specs/anActionContext';

// Two runs that start close together work out the same next version. The one whose release lands second gets a
// 422 for a release that belongs to another commit - it lost the version and must not be told it succeeded.
describe('when creating a release that another commit claimed first', () => {
    let thrown: unknown;

    beforeEach(async () => {
        const fake: FakeOctokit = aFakeOctokit();
        fake.createRelease.rejects({ status: 422 });
        fake.getReleaseByTag.resolves({ data: { tag_name: 'v1.2.4', target_commitish: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' } });

        const releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());

        try {
            await releases.create({
                tag: 'v1.2.4',
                name: 'Release v1.2.4',
                notes: 'The notes',
                generateNotes: false,
                isPrerelease: false,
                targetCommitish: 'abcabcabcabcabcabcabcabcabcabcabcabcabca'
            });
        } catch (ex) {
            thrown = ex;
        }
    });

    it('should fail because the version is claimed by another commit', () => {
        (thrown as VersionClaimedByAnotherCommit).should.be.instanceOf(VersionClaimedByAnotherCommit);
    });

    it('should name the commit that claimed it', () => {
        (thrown as VersionClaimedByAnotherCommit).claimedBy.should.equal('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    });
});
