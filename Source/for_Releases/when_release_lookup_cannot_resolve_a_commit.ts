// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { beforeEach, describe, it } from 'vitest';

import { Releases } from '../Releases';
import { RecordingLogger } from '../specs/RecordingLogger';
import { aFakeOctokit, FakeOctokit } from '../specs/aFakeOctokit';
import { anActionContext } from '../specs/anActionContext';

let fake: FakeOctokit;
let logger: RecordingLogger;
let releases: Releases;
beforeEach(() => {
    fake = aFakeOctokit();
    logger = new RecordingLogger();
    releases = new Releases(fake.octokit, anActionContext(), logger);
    fake.setReleases([{ tag_name: 'v1.2.3', draft: false, prerelease: false }]);
});

const failure = async (): Promise<unknown> => {
    try { await releases.getLatestReleaseCommit(); } catch (error) { return error; }
    return undefined;
};

describe('when neither releases nor tags exist', () => {
    it('should return no commit without looking up a ref', async () => {
        fake.setReleases([]);
        (await releases.getLatestReleaseCommit() === undefined).should.be.true;
        fake.getRef.called.should.be.false;
    });
});

describe('when an annotated release tag points to another tag', () => {
    it('should stop following tags after sixteen dereferences', async () => {
        fake.getRef.resolves({ data: { object: { type: 'tag', sha: 'annotation' } } });
        fake.getTag.resolves({ data: { object: { type: 'tag', sha: 'nested' } } });
        String(await failure()).should.equal("Error: Could not resolve release tag 'v1.2.3' to a commit.");
        fake.getTag.callCount.should.equal(16);
        fake.getTag.firstCall.args.should.deep.equal([{ owner: 'cratis', repo: 'release-action', tag_sha: 'annotation' }]);
        fake.getTag.lastCall.args.should.deep.equal([{ owner: 'cratis', repo: 'release-action', tag_sha: 'nested' }]);
    });
});

describe('when reading an annotated tag returns 404', () => {
    it('should propagate the original missing-tag error', async () => {
        const error = { status: 404 };
        fake.getRef.resolves({ data: { object: { type: 'tag', sha: 'annotation' } } });
        fake.getTag.callsFake(() => Promise.reject(error));
        (await failure() === error).should.be.true;
    });
});

describe('when repeated version checks fall back to tags', () => {
    it('should cache the releases but paginate the tags on each check', async () => {
        fake.setReleases([]);
        fake.setTags([{ name: 'v1.2.3' }]);
        (await releases.getLatestReleaseVersion()).version.should.equal('1.2.3');
        (await releases.getLatestReleaseVersion()).version.should.equal('1.2.3');
        fake.paginate.callCount.should.equal(3);
        fake.paginate.secondCall.args.should.deep.equal([
            fake.octokit.repos.listTags, { owner: 'cratis', repo: 'release-action', per_page: 100 }
        ]);
        fake.paginate.thirdCall.args.should.deep.equal(fake.paginate.secondCall.args);
    });
});

for (const error of [new Error('offline'), { status: 500 }, null, 'unavailable']) {
    describe(`when looking up a release ref fails with ${String(error)}`, () => {
        it('should rethrow the original non-404 failure unchanged', async () => {
            fake.getRef.callsFake(() => Promise.reject(error));
            (await failure() === error).should.be.true;
        });
    });
}

describe('when listing releases fails', () => {
    it('should retain the rejected release lookup and repeat the default-version warnings in order', async () => {
        fake.paginateRejects(new Error('offline'));
        (await releases.getLatestReleaseVersion()).version.should.equal('0.0.0');
        (await releases.getLatestReleaseVersion()).version.should.equal('0.0.0');
        fake.paginate.callCount.should.equal(1);
        logger.messages.should.deep.equal([
            'Could not determine the latest released version - defaulting to 0.0.0.', 'Error: offline',
            'Could not determine the latest released version - defaulting to 0.0.0.', 'Error: offline'
        ]);
    });
});
