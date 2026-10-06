import { describe, it } from 'vitest';

import { ReleaseNotes } from '../ReleaseNotes';

describe('when removing comments from release notes', () => {

    it('should leave notes without comments as they are', () => {
        ReleaseNotes.withoutComments('## Fixed\n\n- Fixed the thing (#1)\n').should.equal('## Fixed\n\n- Fixed the thing (#1)\n');
    });

    it('should remove a comment within a line', () => {
        ReleaseNotes.withoutComments('- Fixed the thing <!-- internal --> for good').should.equal('- Fixed the thing  for good');
    });

    it('should remove the lines of a comment that is alone on them', () => {
        ReleaseNotes.withoutComments('<!--\nGuidance\n-->\n## Added\n').should.equal('## Added\n');
    });

    it('should remove a comment alone on the last line', () => {
        ReleaseNotes.withoutComments('## Added\n\n- One (#1)\n<!-- trailing -->').should.equal('## Added\n\n- One (#1)\n');
    });

    it('should remove every comment', () => {
        ReleaseNotes.withoutComments('<!-- a -->\n- One\n<!-- b -->\n- Two\n').should.equal('- One\n- Two\n');
    });

    // The template's own guidance shows the reference syntax in inline code inside its comment - that code is
    // part of the comment, not something that protects it.
    it('should remove a comment that holds inline code', () => {
        ReleaseNotes.withoutComments('<!-- End a bullet with `(#123)`. -->\n- One\n').should.equal('- One\n');
    });

    it('should remove a comment that holds a fence', () => {
        ReleaseNotes.withoutComments('<!--\n```\nexample\n```\n-->\n- One\n').should.equal('- One\n');
    });

    it('should remove the shortest comments Markdown recognizes', () => {
        ReleaseNotes.withoutComments('a<!-->b<!--->c').should.equal('abc');
    });

    it('should leave a comment that is never closed', () => {
        ReleaseNotes.withoutComments('- One\n<!-- never closed\n- Two\n').should.equal('- One\n<!-- never closed\n- Two\n');
    });

    it('should leave a comment shown inside inline code', () => {
        ReleaseNotes.withoutComments('- Guidance lives in `<!-- ... -->` comments').should.equal('- Guidance lives in `<!-- ... -->` comments');
    });

    it('should leave a comment shown inside inline code delimited by more than one backtick', () => {
        ReleaseNotes.withoutComments('- Write ``<!-- a ` b -->`` like so').should.equal('- Write ``<!-- a ` b -->`` like so');
    });

    it('should leave a comment shown inside a fenced block', () => {
        const notes = '## Added\n\n```markdown\n<!-- guidance -->\n- One (#1)\n```\n';
        ReleaseNotes.withoutComments(notes).should.equal(notes);
    });

    it('should leave a comment shown inside a tilde fenced block', () => {
        const notes = '~~~\n<!-- guidance -->\n~~~\n';
        ReleaseNotes.withoutComments(notes).should.equal(notes);
    });

    it('should leave a comment inside a fenced block that is never closed', () => {
        const notes = '```\n<!-- guidance -->\n';
        ReleaseNotes.withoutComments(notes).should.equal(notes);
    });

    it('should remove a comment after a fenced block has closed', () => {
        ReleaseNotes.withoutComments('```\ncode\n```\n<!-- after -->\n- One\n').should.equal('```\ncode\n```\n- One\n');
    });

    it('should remove a comment after a lone backtick that opens no code span', () => {
        ReleaseNotes.withoutComments('- A ` on its own <!-- x -->').should.equal('- A ` on its own ');
    });

    it('should leave an escaped comment', () => {
        ReleaseNotes.withoutComments('- Write \\<!-- x --> literally').should.equal('- Write \\<!-- x --> literally');
    });

    it('should remove comments from notes with Windows line endings', () => {
        ReleaseNotes.withoutComments('<!-- a -->\r\n- One\r\n').should.equal('- One\r\n');
    });

    it('should leave a comment shown inside a fenced block in a quote', () => {
        const notes = '> ~~~html\n> <!-- example -->\n> ~~~\n';
        ReleaseNotes.withoutComments(notes).should.equal(notes);
    });

    it('should leave a comment shown inside a fenced block in a list item', () => {
        const notes = '- An example:\n\n    ```\n    <!-- example -->\n    ```\n';
        ReleaseNotes.withoutComments(notes).should.equal(notes);
    });

    // A fence indented four spaces more than its opening is a line of the code, not the end of the block.
    it('should leave a comment after a line that only looks like a closing fence', () => {
        const notes = '```\ncode\n    ```\n<!-- example -->\n```\n';
        ReleaseNotes.withoutComments(notes).should.equal(notes);
    });

    // A backtick fence cannot carry a backtick in its info string, so a line starting ```js``` is inline code.
    it('should remove a comment after a line starting with inline code written with three backticks', () => {
        ReleaseNotes.withoutComments('```js``` inline\n<!-- guidance (#123) -->\n- One\n').should.equal('```js``` inline\n- One\n');
    });

    // A code span never crosses a blank line - also not when the notes use Windows line endings, as descriptions
    // saved from the GitHub web interface do.
    it('should remove a comment between lone backticks in separate paragraphs with Windows line endings', () => {
        ReleaseNotes.withoutComments('A literal `\r\n\r\n<!-- guidance (#123) -->\r\n\r\nAnother `\r\n')
            .should.equal('A literal `\r\n\r\n\r\nAnother `\r\n');
    });

    it('should remove a comment between lone backticks in separate list items', () => {
        ReleaseNotes.withoutComments('- A ` lone\n- B <!-- hidden --> `y`').should.equal('- A ` lone\n- B  `y`');
    });

    it('should leave a comment shown inside inline code that continues on the next line', () => {
        const notes = 'Write `<!--\nguidance -->` like so';
        ReleaseNotes.withoutComments(notes).should.equal(notes);
    });

    it('should leave a comment shown inside a fenced block a list item opens', () => {
        ReleaseNotes.withoutComments('1. ```html\n   <!-- example -->\n   ```\n\n<!-- guidance (#777) -->\n- One\n')
            .should.equal('1. ```html\n   <!-- example -->\n   ```\n\n- One\n');
    });

    it('should remove a comment after the quote holding an unclosed fence ends', () => {
        ReleaseNotes.withoutComments('> ```\n> code\n\n<!-- guidance -->\n- One\n').should.equal('> ```\n> code\n\n- One\n');
    });

    it('should leave a comment shown inside inline code that continues on the next line of a quote', () => {
        const notes = '> Write `<!--\n> example -->` literally.\n';
        ReleaseNotes.withoutComments(notes).should.equal(notes);
    });

    // Release notes come from whoever wrote the pull request description; no line may make reading them slow.
    it('should read a long line of nested quotes quickly', () => {
        const started = performance.now();
        ReleaseNotes.withoutComments(`${'> '.repeat(40)}x\n<!-- a -->\n`).should.equal(`${'> '.repeat(40)}x\n`);
        (performance.now() - started).should.be.lessThan(500);
    });

    it('should read a fence inside many nested quotes quickly', () => {
        const quotes = '> '.repeat(40);
        const notes = `${quotes}\`\`\`\n${`${quotes}line\n`.repeat(200)}${quotes}\`\`\`\n`;
        const started = performance.now();
        ReleaseNotes.withoutComments(notes).should.equal(notes);
        (performance.now() - started).should.be.lessThan(500);
    });

    it('should read a paragraph of many code spans quickly', () => {
        const notes = '`a`\n'.repeat(16000);
        const started = performance.now();
        ReleaseNotes.withoutComments(notes).should.equal(notes);
        (performance.now() - started).should.be.lessThan(500);
    });

    it('should read notes full of comments that are never closed quickly', () => {
        const notes = '<!--'.repeat(16000);
        const started = performance.now();
        ReleaseNotes.withoutComments(notes).should.equal(notes);
        (performance.now() - started).should.be.lessThan(500);
    });

    it('should give nothing for empty notes', () => {
        ReleaseNotes.withoutComments('').should.equal('');
    });
});
