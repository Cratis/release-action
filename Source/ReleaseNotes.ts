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

    // A list item can open a fence on its own line: `1. ```html`. The marker's width counts as indentation.
    private static readonly listMarker = /^[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+/;

    // A backtick fence's info string cannot hold a backtick: a line starting ```js``` is an inline code span.
    private static readonly fence = /^([ ]*)(?:(`{3,})[^`]*|(~{3,}).*)$/;

    // A code span is inline, so it never runs past the end of its block: a blank line, or a line that starts
    // another block - a list item, a heading, a deeper quote, a fence, a thematic break or an HTML comment.
    private static readonly startOfAnotherBlock = /^[ \t]*(?:$|<!--|[-*+][ \t]|\d{1,9}[.)][ \t]|#{1,6}(?:[ \t]|$)|>|`{3,}|~{3,}|(?:[-*_][ \t]*){3,}$)/;

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

        // Once no `-->` follows an opening, none follows a later one either - looking again would only make notes
        // full of unclosed openings slow to read.
        let unclosedFrom = notes.length;

        // The reading only moves forward, so the start of the current line is found by moving forward with it -
        // searching back from every code span would make a long line full of them slow to read.
        let lineStart = 0;
        let lineScannedTo = 0;
        const lineStartOf = (position: number): number => {
            for (; lineScannedTo < position; lineScannedTo++) {
                if (notes[lineScannedTo] === '\n') lineStart = lineScannedTo + 1;
            }
            return lineStart;
        };

        while (index < notes.length) {
            const end = ReleaseNotes.endOfCodeAt(notes, index, lineStartOf);
            if (end > index) {
                published += notes.slice(index, end);
                index = end;
                continue;
            }

            if (index < unclosedFrom && notes.startsWith(ReleaseNotes.commentStart, index)) {
                const close = notes.indexOf(ReleaseNotes.commentEnd, index + 2);
                if (close === -1) {
                    unclosedFrom = index;
                } else {
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
    private static endOfCodeAt(notes: string, index: number, lineStartOf: (position: number) => number): number {
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
            return ReleaseNotes.endOfCodeSpan(notes, index, lineStartOf(index));
        }

        return index;
    }

    /**
     * Drops the comment ending at an index from the notes. When nothing but whitespace shares its first and last
     * lines, the whole of those lines goes with it.
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
     * block closes at a line holding only a fence of the same character that is at least as long, indented at most
     * three spaces more than the opening one, or where the quote or list item holding it ends. A block that is never
     * closed runs to the end of the notes, as Markdown renders it.
     */
    private static endOfFencedBlock(notes: string, lineStart: number): number | undefined {
        const firstLineEnd = ReleaseNotes.endOfLine(notes, lineStart);
        const quoted = ReleaseNotes.quotesAt(notes, lineStart, firstLineEnd);

        let rest = ReleaseNotes.lineAt(notes, quoted.end, firstLineEnd);
        let markerWidth = 0;
        for (let marker = ReleaseNotes.listMarker.exec(rest); marker; marker = ReleaseNotes.listMarker.exec(rest)) {
            markerWidth += marker[0].length;
            rest = rest.slice(marker[0].length);
        }

        const opening = ReleaseNotes.fence.exec(rest);
        if (!opening) {
            return undefined;
        }

        const fence = opening[2] ?? opening[3];
        const indentation = markerWidth + opening[1].length + 3;
        const closing = new RegExp(`^[ ]{0,${indentation}}${fence[0] === '`' ? '`' : '~'}{${fence.length},}[ \\t]*$`);

        let line = ReleaseNotes.startOfNextLine(notes, firstLineEnd);
        while (line < notes.length) {
            const lineEnd = ReleaseNotes.endOfLine(notes, line);
            const inside = ReleaseNotes.quotesAt(notes, line, lineEnd, quoted.count);
            if (inside.count < quoted.count || ReleaseNotes.leavesListItem(notes, inside.end, lineEnd, markerWidth)) {
                return line;
            }
            if (closing.test(ReleaseNotes.lineAt(notes, inside.end, lineEnd))) {
                return ReleaseNotes.startOfNextLine(notes, lineEnd);
            }
            line = ReleaseNotes.startOfNextLine(notes, lineEnd);
        }

        return notes.length;
    }

    /**
     * Whether a line leaves the list item whose marker opened a fence - a line that is not blank and is indented
     * less than the item's content.
     */
    private static leavesListItem(notes: string, lineStart: number, lineEnd: number, markerWidth: number): boolean {
        if (markerWidth === 0) {
            return false;
        }

        const line = ReleaseNotes.lineAt(notes, lineStart, lineEnd);
        const indentation = line.length - line.trimStart().length;
        return line.trim() !== '' && indentation < markerWidth;
    }

    /**
     * The end of an inline code span opening at an index - after the closing run of backticks of the same length.
     * A run that is never closed within its block is literal backticks, and ends right after itself.
     */
    private static endOfCodeSpan(notes: string, start: number, lineStart: number): number {
        const length = ReleaseNotes.backtickRunAt(notes, start);
        const afterOpening = start + length;
        const depth = ReleaseNotes.quotesAt(notes, lineStart, start).count;

        let index = afterOpening;
        while (index < notes.length) {
            if (notes[index] === '\n') {
                const next = index + 1;
                if (ReleaseNotes.startsAnotherBlock(notes, next, depth)) {
                    return afterOpening;
                }
                index = next;
                continue;
            }

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

    /**
     * Whether the line starting at an index leaves the block a code span sits in - by leaving the quotes it is in,
     * or by starting another block inside them.
     */
    private static startsAnotherBlock(notes: string, lineStart: number, depth: number): boolean {
        const lineEnd = ReleaseNotes.endOfLine(notes, lineStart);
        const quoted = ReleaseNotes.quotesAt(notes, lineStart, lineEnd, depth);
        return quoted.count < depth || ReleaseNotes.startOfAnotherBlock.test(ReleaseNotes.lineAt(notes, quoted.end, lineEnd));
    }

    /**
     * Reads the block quote markers - `>`, each after at most three spaces and followed by an optional space - at
     * the start of a line, up to a maximum. Read one character at a time, so a long run of markers costs no more
     * than its length.
     */
    private static quotesAt(notes: string, lineStart: number, lineEnd: number, maximum = Number.MAX_SAFE_INTEGER): { count: number; end: number } {
        let count = 0;
        let end = lineStart;

        while (count < maximum) {
            let position = end;
            while (position < lineEnd && position - end < 3 && notes[position] === ' ') {
                position++;
            }
            if (position >= lineEnd || notes[position] !== '>') {
                break;
            }

            position++;
            if (position < lineEnd && (notes[position] === ' ' || notes[position] === '\t')) {
                position++;
            }

            count++;
            end = position;
        }

        return { count, end };
    }

    /**
     * The text of a line, without the carriage return of a Windows line ending.
     */
    private static lineAt(notes: string, start: number, end: number): string {
        return notes.slice(start, end).replace(/\r$/, '');
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
