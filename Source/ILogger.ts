/**
 * Defines a logger used throughout the action.
 *
 * The action deliberately depends on this abstraction rather than a concrete logging library, so that
 * the log sink can be swapped (GitHub workflow commands at runtime, a recording fake in specs) without
 * touching any of the types that log.
 */
export interface ILogger {
    debug(message: unknown): void;
    info(message: unknown): void;
    warn(message: unknown): void;
    error(message: unknown): void;
}
