import { describe, it } from 'vitest';

import { formatLogMessage } from '../../logging';

describe('when formatting a log message for different kinds of value', () => {
    it('should pass a string through unchanged', () => {
        formatLogMessage('a message').should.equal('a message');
    });

    it('should render an error as its stack', () => {
        const error = new Error('boom');
        formatLogMessage(error).should.equal(error.stack);
    });

    it('should render an object as pretty JSON', () => {
        formatLogMessage({ a: 1 }).should.equal('{\n  "a": 1\n}');
    });

    it('should fall back to String for a circular object', () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;

        formatLogMessage(circular).should.equal('[object Object]');
    });
});
