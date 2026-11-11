// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { describe, it } from 'vitest';

import { AggregatedReleaseNotes } from '../AggregatedReleaseNotes';
import { defaultReleaseOptions } from '../IReleaseOptions';
import { RecordingLogger } from '../specs/RecordingLogger';
import { aPullRequest } from '../specs/aPullRequest';

const merge = (body: string) => AggregatedReleaseNotes.merge([
    aPullRequest({ number: 1, body }), aPullRequest({ number: 2, body: '## Fixed\n\n- Second.' })
], new RecordingLogger());

describe('when a fenced bullet contains mismatched and short fence markers', () => {
    it('should preserve them and all headings and references until a matching longer fence', () => {
        const bullet = '- Example:\n  ~~~~md\n  ```\n  ~~~\n  ## Added\n  [guide]: https://example.com/inside\n  ~~~~~';
        merge(`## Fixed\n\n${bullet}`).should.equal(`## Fixed\n\n${bullet}\n\n- Second.`);
    });
});

for (const blank of [false, true]) {
    describe(`when a reference definition follows a bullet with a preceding blank line of ${blank}`, () => {
        it('should preserve the blank-line boundary when deciding whether the next line continues the bullet', () => {
            const separator = blank ? '\n\n' : '\n';
            const expected = blank ? '- First.' : '- First.\nwrapped';
            merge(`## Fixed\n\n- First.${separator}[guide]: https://example.com/guide\nwrapped`)
                .should.equal(`## Fixed\n\n${expected}\n\n- Second.\n\n[guide]: https://example.com/guide`);
        });
    });
}

describe('when a revert names one prior PR but references the commit of an earlier one', () => {
    it('should cancel the first matching prior change in collection order', () => {
        const first = aPullRequest({ number: 1, merge_commit_sha: 'a'.repeat(40) });
        const second = aPullRequest({ number: 2, merge_commit_sha: 'b'.repeat(40) });
        const revert = aPullRequest({ number: 3, body: `Reverts cratis/release-action#2\nThis reverts commit ${first.merge_commit_sha}.` });
        AggregatedReleaseNotes.included([first, second, revert], 'cratis/release-action', defaultReleaseOptions)
            .map(pullRequest => pullRequest.number).should.deep.equal([2]);
    });
});
