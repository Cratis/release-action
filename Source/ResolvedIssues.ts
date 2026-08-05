/**
 * The issue numbers a set of release notes says the release resolves.
 *
 * Only the trailing parenthesized form the pull request template mandates is read - a bullet ends with the issue
 * it delivers, as in `- Fixed the thing (#123)`. Prose refers to issues without parentheses ("see #123", "related
 * to #123", "blocked on #123"), and reading those would close issues a release merely mentions. The parentheses
 * are what distinguishes "this bullet delivers that issue" from "this bullet talks about it", so they are the
 * whole of the contract and nothing looser is accepted.
 *
 * Cross-repository references (`Cratis/Screenplay#32`) are deliberately not read. They are common in these notes
 * and they name an issue in another repository, which this action has neither the token scope nor the business to
 * close.
 */
export class ResolvedIssues {

    // A '#' preceded by anything other than '(' is prose, and an owner/repo prefix makes it another repository's
    // issue. Both are excluded by requiring the '(' to sit immediately before the '#'.
    private static readonly reference = /(?<![\w/-])\(#(\d+)\)/g;

    /**
     * Gets the issue numbers the notes say the release resolves, in ascending order and without duplicates.
     * @param notes The release notes to read.
     * @returns The issue numbers.
     */
    static in(notes: string): number[] {
        if (!notes) {
            return [];
        }

        const found = new Set<number>();
        for (const match of notes.matchAll(ResolvedIssues.reference)) {
            const number = Number(match[1]);

            // '(#0)' is not an issue, and a number this large is a typo rather than a reference - closing on
            // either would act on something the author did not name.
            if (Number.isSafeInteger(number) && number > 0) {
                found.add(number);
            }
        }

        return [...found].sort((left, right) => left - right);
    }
}
