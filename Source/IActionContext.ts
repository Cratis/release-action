/**
 * Defines the parts of the GitHub Actions context the action actually needs.
 *
 * `Context` from `@actions/github` structurally satisfies this, but depending on the narrow shape keeps
 * the action decoupled from the toolkit's internals and makes it trivial to construct in specs.
 */
export interface IActionContext {
    readonly eventName: string;
    readonly sha: string;
    readonly repo: { readonly owner: string; readonly repo: string };
    readonly payload: { readonly pull_request?: Record<string, unknown> };
}
