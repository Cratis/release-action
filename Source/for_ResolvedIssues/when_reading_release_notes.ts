import { describe, it } from 'vitest';

import { ResolvedIssues } from '../ResolvedIssues';

describe('when reading which issues release notes resolve', () => {

    it('should read the issue a bullet ends with', () => {
        ResolvedIssues.in('- Fixed the thing (#123)').should.eql([123]);
    });

    it('should read every bullet in the notes', () => {
        ResolvedIssues.in('## Fixed\n\n- One (#1)\n- Two (#22)\n').should.eql([1, 22]);
    });

    it('should read an issue named twice only once', () => {
        ResolvedIssues.in('- One (#7)\n- Also one (#7)').should.eql([7]);
    });

    it('should order them ascending however the notes order them', () => {
        ResolvedIssues.in('- Later (#90)\n- Earlier (#9)').should.eql([9, 90]);
    });

    // The distinction the whole feature rests on: a release delivers what a bullet ends with, and merely talks
    // about what prose mentions. Closing on prose would close issues a release only refers to.
    it('should not read an issue a sentence merely mentions', () => {
        ResolvedIssues.in('- Fixed the thing, see #123 for background').should.eql([]);
    });

    it('should not read an issue named as a dependency', () => {
        ResolvedIssues.in('- Fixed the thing. Related: #123, blocked on #456').should.eql([]);
    });

    // Another repository's issue is neither this action's to close nor within its token's reach.
    it('should not read an issue in another repository', () => {
        ResolvedIssues.in('- Fixed the thing (Cratis/Screenplay#32)').should.eql([]);
    });

    it('should not read a number that is not an issue', () => {
        ResolvedIssues.in('- Fixed the thing (#0)').should.eql([]);
    });

    it('should read nothing from notes that name no issue', () => {
        ResolvedIssues.in('- Fixed the thing').should.eql([]);
    });

    it('should read nothing from empty notes', () => {
        ResolvedIssues.in('').should.eql([]);
    });
});
