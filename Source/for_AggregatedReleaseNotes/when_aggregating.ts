// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { beforeEach, describe, it } from 'vitest';

import { AggregatedReleaseNotes } from '../AggregatedReleaseNotes';
import { defaultReleaseOptions } from '../IReleaseOptions';
import { PullRequest } from '../PullRequest';
import { ResolvedIssues } from '../ResolvedIssues';
import { RecordingLogger } from '../specs/RecordingLogger';
import { aPullRequest } from '../specs/aPullRequest';

const pull = (number: number, body: string, labels = ['patch']) => aPullRequest({ number, body, labels: labels.map(name => ({ name })) });
const included = (pulls: PullRequest[]) => AggregatedReleaseNotes.included(pulls, 'cratis/release-action', defaultReleaseOptions);
let logger: RecordingLogger;
beforeEach(() => { logger = new RecordingLogger(); });

describe('when only one PR is included', () => {
    it('should keep its body byte for byte', () => {
        const body = '<!-- template -->\n## Fixed\n\n- A fix. (#1)\n';
        AggregatedReleaseNotes.merge([pull(1, body)], logger).should.equal(body);
    });
    it('should accept a missing body', () => AggregatedReleaseNotes.merge([pull(1, '')], logger).should.equal(''));
});

describe('when merging several release descriptions', () => {
    it('should preserve complete bullets, continuation lines, fences and every trailing issue reference', () => {
        const body = AggregatedReleaseNotes.merge([
            pull(1, '## Summary\n\nSummary prose.\n\n## Changed\n\n- One change\nwith a soft wrap. (#1) (#2)\n\n  Indented continuation.\n  ```md\n  ## Not a heading\n  <!-- example -->\n  ```\n\nSign-off\n\n## Unknown\n\n- Dropped\n<!-- secret (#99) -->'),
            pull(2, '## Added\n\n### APIs\n\n- New API. (#3)\n\n## Fixed\n\n- A fix. (#4)')
        ], logger);
        body.should.include('with a soft wrap. (#1) (#2)');
        body.should.include('  Indented continuation.');
        body.should.include('  ## Not a heading\n  <!-- example -->');
        body.should.include('### APIs\n\n- New API. (#3)');
        body.should.not.include('Sign-off');
        body.should.not.include('secret');
        body.should.include('## Summary\n\nSummary prose.');
        body.indexOf('## Added').should.be.lessThan(body.indexOf('## Changed'));
        body.indexOf('## Changed').should.be.lessThan(body.indexOf('## Fixed'));
        logger.messages.join('\n').should.include('unknown release-note section');
        ResolvedIssues.in(body).should.deep.equal([1, 2, 3, 4]);
    });
    it('should not publish hidden comments exposed by an outdented list fence', () => {
        const body = AggregatedReleaseNotes.merge([
            pull(1, '## Changed\n\n- One change.\n\n  ```md\n## Not in the list\n<!-- hidden guidance (#99) -->\n  ```'),
            pull(2, '## Fixed\n\n- A fix. (#4)')
        ], logger);
        body.should.not.include('hidden guidance');
        ResolvedIssues.in(body).should.deep.equal([4]);
    });
    it('should reject multiple bodies without recognized release sections', () => {
        (() => AggregatedReleaseNotes.merge([pull(1, 'Prose'), pull(2, 'Prose')], logger)).should.throw('No release-note sections');
    });
    it('should return no notes for no changes', () => AggregatedReleaseNotes.merge([], logger).should.equal(''));
});

describe('when filtering pending PRs', () => {
    it('should drop Dependabot and deliberate no-release PRs', () => {
        included([pull(1, ''), { ...pull(2, ''), user: { login: 'dependabot[bot]' } }, pull(3, '', ['no-release'])])
            .map(pullRequest => pullRequest.number).should.deep.equal([1]);
    });
    it('should reject multiple intents before excluding no-release', () => {
        (() => included([pull(1, '', ['major', 'no-release'])])).should.throw('more than one release intent');
    });
    it('should ignore multiple intents on Dependabot PRs', () => {
        included([{ ...pull(1, '', ['major', 'patch']), user: { login: 'app/dependabot' } }]).should.deep.equal([]);
    });
    it('should interpret custom label aliases as distinct intents only once', () => {
        AggregatedReleaseNotes.intents(pull(1, '', ['breaking', 'major', 'feature']),
            { ...defaultReleaseOptions, majorLabels: ['breaking', 'major'], minorLabels: ['feature'] })
            .should.deep.equal(['major', 'minor']);
    });
});

describe('when netting revert chains', () => {
    it('should cancel a PR and its revert', () => {
        included([pull(1, 'Original'), pull(2, 'Reverts cratis/release-action#1.')]).should.deep.equal([]);
    });
    it('should restore the original notes once after a revert of a revert', () => {
        included([pull(1, 'Original'), pull(2, 'Reverts cratis/release-action#1'), pull(3, 'Reverts CRATIS/release-action#2')])
            .map(pullRequest => pullRequest.number).should.deep.equal([1]);
    });
    it('should recognize a commit-SHA revert', () => {
        const original = { ...pull(1, 'Original'), merge_commit_sha: 'a'.repeat(40) };
        included([original, pull(2, `This reverts commit ${original.merge_commit_sha}.`)]).should.deep.equal([]);
    });
    it('should not cancel an unrelated repository or an earlier-release change', () => {
        included([pull(1, 'Original'), pull(2, 'Reverts someone/else#1'), pull(3, 'Reverts cratis/release-action#99')])
            .map(pullRequest => pullRequest.number).should.deep.equal([1, 2, 3]);
    });
});
