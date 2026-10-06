/**
 * Turns the notes a release is cut with - a pull request description, or the notes a manual run was given - into
 * the body that is published.
 *
 * Pull request templates carry their guidance in HTML comments, and authors often leave them in place. The release
 * page hides a comment, but the published body keeps it, so every consumer of the raw body - feeds, aggregated
 * release notes, anything reading the API - sees guidance that was never meant to be published. Closed comments
 * are therefore removed.
 *
 * Code is left exactly as written. A fenced block or an inline span showing `<!-- ... -->` is an example of the
 * syntax, not a comment, and removing it would change what the notes document. The notes are read from left to
 * right the way Markdown reads them, so whichever starts first wins: backticks inside a comment are part of the
 * comment, and a comment marker inside code is part of the code.
 */
export class ReleaseNotes {

    private static readonly commentStart = '<!--';
    private static readonly commentEnd = '-->';
    private static readonly fenceOpening = /^[ \t]*(`{3,}|~{3,})/;
    private static readonly blankLine = /\n[ \t]*\n/g;

    /**
     * Removes the closed HTML comments from release notes, leaving fenced and inline code untouched. A comment
     * that is alone on its lines takes those lines with it, so a template comment leaves no blank gap behind. A
     * comment that is never closed is left alone - it is not clear where it was meant to end.
     * @param notes The release notes.
     * @returns The notes without their comments.
     */
    static withoutComments(notes: string): string {
        if (!notes) {
            return '';
        }

        let published = '';
        let index = 0;

        while (index < notes.length) {
            const end = ReleaseNotes.endOfCodeAt(notes, index);
            if (end > index) {
                published += notes.slice(index, end);
                index = end;
                continue;
            }

            if (notes.startsWith(ReleaseNotes.commentStart, index)) {
                const close = notes.indexOf(ReleaseNotes.commentEnd, index + 2);
                if (close !== -1) {
                    const removed = ReleaseNotes.removeComment(notes, published, close + ReleaseNotes.commentEnd.length);
                    published = removed.published;
                    index = removed.next;
                    continue;
                }
            }

            published += notes[index];
            index++;
        }

        return published;
    }

    /**
     * Where the code - or the escaped character - starting at an index ends, or the index itself when nothing that
     * must be kept verbatim starts there.
     */
    private static endOfCodeAt(notes: string, index: number): number {
        const atLineStart = index === 0 || notes[index - 1] === '\n';
        if (atLineStart) {
            const fenceEnd = ReleaseNotes.endOfFencedBlock(notes, index);
            if (fenceEnd !== undefined) {
                return fenceEnd;
            }
        }

        // An escaped character is literal - `\<!--` is not a comment and `` \` `` does not start a code span.
        if (notes[index] === '\\' && index + 1 < notes.length) {
            return index + 2;
        }

        if (notes[index] === '`') {
            return ReleaseNotes.endOfCodeSpan(notes, index);
        }

        return index;
    }

    /**
     * Drops the comment ending at an index from the notes. When nothing but whitespace shares its first and last lines, the whole of
     * those lines goes with it.
     */
    private static removeComment(notes: string, published: string, end: number): { published: string; next: number } {
        const lineStart = published.lastIndexOf('\n') + 1;
        const newline = notes.indexOf('\n', end);
        const lineEnd = newline === -1 ? notes.length : newline;

        const aloneOnItsLines = published.slice(lineStart).trim() === '' && notes.slice(end, lineEnd).trim() === '';
        if (!aloneOnItsLines) {
            return { published, next: end };
        }

        return {
            published: published.slice(0, lineStart),
            next: newline === -1 ? notes.length : newline + 1
        };
    }

    /**
     * The end of a fenced code block opening at the start of a line, or undefined when no fence opens there. The
     * block closes at a line holding only a fence of the same character that is at least as long; a block that is
     * never closed runs to the end of the notes, as Markdown renders it.
     */
    private static endOfFencedBlock(notes: string, lineStart: number): number | undefined {
        const firstLineEnd = ReleaseNotes.endOfLine(notes, lineStart);
        const opening = ReleaseNotes.fenceOpening.exec(notes.slice(lineStart, firstLineEnd));
        if (!opening) {
            return undefined;
        }

        const fence = opening[1];
        const closing = new RegExp(`^[ \\t]*${fence[0] === '`' ? '`' : '~'}{${fence.length},}[ \\t]*$`);

        let line = ReleaseNotes.startOfNextLine(notes, firstLineEnd);
        while (line < notes.length) {
            const lineEnd = ReleaseNotes.endOfLine(notes, line);
            if (closing.test(notes.slice(line, lineEnd).replace(/\r$/, ''))) {
                return ReleaseNotes.startOfNextLine(notes, lineEnd);
            }
            line = ReleaseNotes.startOfNextLine(notes, lineEnd);
        }

        return notes.length;
    }

    /**
     * The end of an inline code span opening at an index - after the closing run of backticks of the same length.
     * A run that is never closed within its paragraph is literal backticks, and ends right after itself.
     */
    private static endOfCodeSpan(notes: string, start: number): number {
        const length = ReleaseNotes.backtickRunAt(notes, start);
        const afterOpening = start + length;

        ReleaseNotes.blankLine.lastIndex = afterOpening;
        const paragraphEnd = ReleaseNotes.blankLine.exec(notes)?.index ?? notes.length;

        let index = afterOpening;
        while (index < paragraphEnd) {
            if (notes[index] !== '`') {
                index++;
                continue;
            }

            const run = ReleaseNotes.backtickRunAt(notes, index);
            if (run === length) {
                return index + run;
            }
            index += run;
        }

        return afterOpening;
    }

    private static backtickRunAt(notes: string, index: number): number {
        let end = index;
        while (notes[end] === '`') {
            end++;
        }
        return end - index;
    }

    private static endOfLine(notes: string, index: number): number {
        const newline = notes.indexOf('\n', index);
        return newline === -1 ? notes.length : newline;
    }

    private static startOfNextLine(notes: string, lineEnd: number): number {
        return lineEnd < notes.length ? lineEnd + 1 : notes.length;
    }
}
