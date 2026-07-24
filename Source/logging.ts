import { debug, error, info, warning } from '@actions/core';

import { ILogger } from './ILogger';

/**
 * Renders anything that gets logged into a string: strings pass through, errors become their stack, and
 * everything else is pretty-printed as JSON - falling back to `String` for values JSON cannot handle (such as
 * a circular object or a `bigint`).
 */
export const formatLogMessage = (message: unknown): string => {
    if (typeof message === 'string') return message;
    if (message instanceof Error) return message.stack ?? message.message;
    try {
        return JSON.stringify(message, undefined, 2) ?? String(message);
    } catch {
        return String(message);
    }
};

/**
 * The logger used by the action. Writes through the GitHub Actions toolkit so that warnings and errors
 * surface as proper workflow annotations, and debug output honors the `ACTIONS_STEP_DEBUG` setting.
 */
export const logger: ILogger = {
    debug: message => debug(formatLogMessage(message)),
    info: message => info(formatLogMessage(message)),
    warn: message => warning(formatLogMessage(message)),
    error: message => error(formatLogMessage(message))
};
