/**
 * The error raised when GitHub refuses to create the release because the commit's workflows differ from the
 * default branch's.
 *
 * Creating a release creates its tag, and a tag on a commit whose `.github/workflows` differ from the default
 * branch head counts as a workflow change, which the `GITHUB_TOKEN` cannot make. GitHub answers with a 403
 * ("Resource not accessible by integration"). It happens when a release run reaches its release job after another
 * pull request changed workflows on the default branch. Re-running the run fails the same way, as it still
 * targets the same commit.
 */
export class WorkflowsDifferFromDefaultBranch extends Error {

    constructor(
        readonly targetCommitish: string,
        readonly defaultBranch: string,
        readonly rejection: unknown) {
        super(
            `The release could not be created: the '.github/workflows' of commit '${targetCommitish}' differ from '${defaultBranch}', ` +
            `and the GITHUB_TOKEN cannot create a tag on a commit that changes workflows. Do not re-run this run - it fails the same way. ` +
            `Release by running the Publish workflow with 'workflow_dispatch' from the current '${defaultBranch}', giving it the pull request's release notes. ` +
            `Original error: ${(rejection as { message?: string })?.message ?? String(rejection)}`);
        this.name = 'WorkflowsDifferFromDefaultBranch';
    }
}
