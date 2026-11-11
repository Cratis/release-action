// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { describe, it } from 'vitest';

import { ReleaseNotes } from '../ReleaseNotes';

describe('when a thematic marker shares its line with text', () => {
    it('should keep reading the inline span across that line', () => {
        const notes = 'Write `literal\n--- <!-- hidden --> `code`';
        ReleaseNotes.withoutComments(notes).should.equal(notes);
    });
});

describe('when a thematic marker occupies its own line', () => {
    it('should end an unmatched inline span before the next paragraph', () => {
        ReleaseNotes.withoutComments('Write `literal\n---\nText <!-- hidden --> `code`')
            .should.equal('Write `literal\n---\nText  `code`');
    });
});

for (const indentation of [0, 3, 4]) {
    describe(`when a closing fence is indented by ${indentation} columns beyond its opening`, () => {
        it('should protect comments only if that fence can close the block', () => {
            const closing = `${' '.repeat(indentation)}~~~\n`;
            const notes = `~~~html\n<!-- example -->\n${closing}<!-- guidance -->\n`;
            const expected = indentation <= 3 ? `~~~html\n<!-- example -->\n${closing}` : `~~~html\n${closing}`;
            ReleaseNotes.withoutComments(notes).should.equal(expected);
        });
    });
}

for (const quote of ['>', '> ', '>\t', '   >']) {
    describe(`when a Windows-line-ended fenced block uses quote marker ${JSON.stringify(quote)}`, () => {
        it('should retain code comments and remove the complete standalone guidance line', () => {
            const block = `${quote}~~~html\r\n${quote}<!-- example -->\r\n${quote}~~~\r\n`;
            ReleaseNotes.withoutComments(`${block}<!-- guidance -->\r\n`).should.equal(block);
        });
    });
}

for (const block of ['# Heading', '> Quote']) {
    describe(`when an inline span encounters a new block starting with ${block}`, () => {
        it('should end the unmatched span before removing a comment in the next block', () => {
            ReleaseNotes.withoutComments(`Write \`literal\n${block} <!-- hidden --> \`code\``)
                .should.equal(`Write \`literal\n${block}  \`code\``);
        });
    });
}
