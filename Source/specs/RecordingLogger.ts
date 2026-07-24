import { ILogger } from '../ILogger';

/**
 * A logger that records what was logged, so specs never write to the console and can assert on output.
 */
export class RecordingLogger implements ILogger {
    readonly messages: string[] = [];

    debug(message: unknown) {
        this.record(message);
    }

    info(message: unknown) {
        this.record(message);
    }

    warn(message: unknown) {
        this.record(message);
    }

    error(message: unknown) {
        this.record(message);
    }

    private record(message: unknown) {
        this.messages.push(typeof message === 'string' ? message : String(message));
    }
}
