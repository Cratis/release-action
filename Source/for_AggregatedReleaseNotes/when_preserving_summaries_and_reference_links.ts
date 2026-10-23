// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { beforeEach, describe, it, vi } from 'vitest';

import { AggregatedReleaseNotes } from '../AggregatedReleaseNotes';
import { RecordingLogger } from '../specs/RecordingLogger';
import { aPullRequest } from '../specs/aPullRequest';

const pull = (number: number, body: string) => aPullRequest({ number, body });
let logger: RecordingLogger;
beforeEach(() => { logger = new RecordingLogger(); });

describe('with explicit summaries and unheaded lead paragraphs', () => {
    it('should join all summaries in PR order before the known sections', () => {
        const body = AggregatedReleaseNotes.merge([
            pull(1, '## Summary\n\nFirst summary.\n\nAnother paragraph.\n\n## Fixed\n\n- First fix.'),
            pull(2, '<!-- hidden -->\nSecond summary.\n\nAnother lead paragraph.\n\n## Added\n\n- An API.'),
            pull(3, '## Summary\n\nThird summary.\n\n## Fixed\n\n- Third fix.')
        ], logger);
        body.should.equal('## Summary\n\nFirst summary.\n\nAnother paragraph.\n\nSecond summary.\n\nAnother lead paragraph.\n\nThird summary.\n\n## Added\n\n- An API.\n\n## Fixed\n\n- First fix.\n\n- Third fix.');
    });
    it('should not interpret fenced headings as sections or leak unknown prose into summaries', () => {
        const body = AggregatedReleaseNotes.merge([
            pull(1, 'Lead.\n\n```md\n## Example\n```\n\n## Fixed\n\n- A fix.\n\n## Unknown\n\nNot a summary.'),
            pull(2, '## Summary\n\n<!-- omitted -->\n\n## Added\n\n- Another change.')
        ], logger);
        body.should.equal('## Summary\n\nLead.\n\n```md\n## Example\n```\n\n## Added\n\n- Another change.\n\n## Fixed\n\n- A fix.');
    });
    it('should omit the Summary heading if no PR has a summary', () => {
        AggregatedReleaseNotes.merge([
            pull(1, '## Fixed\n\n- First.'), pull(2, '## Fixed\n\n- Second.')
        ], logger).should.equal('## Fixed\n\n- First.\n\n- Second.');
    });
});

describe('with reference definitions after blank lines', () => {
    it('should keep each definition once after the merged sections', () => {
        const body = AggregatedReleaseNotes.merge([
            pull(1, '## Fixed\n\n- Read [the guide][guide].\n\n[guide]: https://example.com/guide\n[guide]: https://example.com/guide'),
            pull(2, '## Added\n\n- See [API][api].\n\n[api]: https://example.com/api "API"')
        ], logger);
        body.should.equal('## Added\n\n- See [API][api].\n\n## Fixed\n\n- Read [the guide][guide].\n\n[guide]: https://example.com/guide\n[api]: https://example.com/api "API"');
    });
    it('should keep the first definition and warn about a duplicate label across PRs', () => {
        const warn = vi.spyOn(logger, 'warn');
        const body = AggregatedReleaseNotes.merge([
            pull(1, '## Fixed\n\n- Read [first][The Guide].\n\n[The Guide]: https://example.com/first'),
            pull(2, '## Fixed\n\n- Read [second][the guide].\n\n[the   GUIDE]: https://example.com/second')
        ], logger);
        body.should.include('[The Guide]: https://example.com/first');
        body.should.not.include('https://example.com/second');
        warn.mock.calls.should.deep.equal([['PR #2: duplicate release-note reference label "the   GUIDE"; keeping the first definition.']]);
    });
    it('should preserve definitions used in summaries but not collect fenced examples or hidden definitions', () => {
        const body = AggregatedReleaseNotes.merge([
            pull(1, 'Read [guide].\n\n[guide]: https://example.com/guide\n\n## Fixed\n\n- Example:\n  ```md\n  [guide]: https://example.com/example\n  ```\n<!-- [hidden]: https://example.com/hidden -->'),
            pull(2, '## Fixed\n\n- Second.')
        ], logger);
        body.should.equal('## Summary\n\nRead [guide].\n\n## Fixed\n\n- Example:\n  ```md\n  [guide]: https://example.com/example\n  ```\n\n- Second.\n\n[guide]: https://example.com/guide');
    });
});
