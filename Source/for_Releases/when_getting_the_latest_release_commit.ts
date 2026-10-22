// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { beforeEach, describe, it } from 'vitest';
import sinon from 'sinon';

import { Releases } from '../Releases';
import { RecordingLogger } from '../specs/RecordingLogger';
import { aFakeOctokit, FakeOctokit } from '../specs/aFakeOctokit';
import { anActionContext } from '../specs/anActionContext';

let fake: FakeOctokit;
let releases: Releases;
const sha = 'a'.repeat(40);
beforeEach(() => {
    fake = aFakeOctokit();
    releases = new Releases(fake.octokit, anActionContext(), new RecordingLogger());
    fake.setReleases([{ tag_name: 'v1.2.3', target_commitish: 'main' },
        { tag_name: 'v2.0.0', draft: true }, { tag_name: 'v3.0.0-alpha', prerelease: true }]);
    fake.getRef.resolves({ data: { object: { type: 'commit', sha } } });
});

describe('when resolving the stable release lower bound', () => {
    it('should resolve the actual tag rather than the moving target_commitish branch', async () => {
        ((await releases.getLatestReleaseCommit()) ?? '').should.equal(sha);
        fake.getRef.calledOnceWithExactly({ owner: 'cratis', repo: 'release-action', ref: 'tags/v1.2.3' }).should.be.true;
    });
    it('should peel annotated tags through to a commit', async () => {
        fake.getRef.resolves({ data: { object: { type: 'tag', sha: 'outer' } } });
        fake.getTag.withArgs(sinon.match({ tag_sha: 'outer' })).resolves({ data: { object: { type: 'tag', sha: 'inner' } } });
        fake.getTag.withArgs(sinon.match({ tag_sha: 'inner' })).resolves({ data: { object: { type: 'commit', sha } } });
        ((await releases.getLatestReleaseCommit()) ?? '').should.equal(sha);
    });
    it('should reject a tag that does not point to a commit', async () => {
        fake.getRef.resolves({ data: { object: { type: 'tree', sha } } });
        let message = '';
        try { await releases.getLatestReleaseCommit(); } catch (error) { message = String(error); }
        message.should.include('Could not resolve release tag');
    });
    it('should propagate API failures instead of treating all history as unreleased', async () => {
        fake.paginateRejects(new Error('API denied'));
        let message = '';
        try { await releases.getLatestReleaseCommit(); } catch (error) { message = String(error); }
        message.should.include('API denied');
    });
    it('should bootstrap from the highest version tag, including floating aliases', async () => {
        fake.setReleases([]);
        fake.setTags([{ name: 'v1' }, { name: 'v0.9.0' }, { name: 'v2.0.0-alpha' }]);
        ((await releases.getLatestReleaseCommit()) ?? '').should.equal(sha);
        fake.getRef.firstCall.args[0].ref.should.equal('tags/v1');
    });
    it('should return no lower bound before the first version tag', async () => {
        fake.setReleases([]);
        ((await releases.getLatestReleaseCommit()) === undefined).should.be.true;
        fake.getRef.called.should.be.false;
    });
});
