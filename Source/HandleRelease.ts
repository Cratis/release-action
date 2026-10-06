import { IActionContext } from './IActionContext';
import { IIssues } from './IIssues';
import { ILogger } from './ILogger';
import { IReleaseDecisions } from './IReleaseDecisions';
import { IReleases } from './IReleases';
import { ReleaseDecision } from './ReleaseDecision';
import { ReleaseNotes } from './ReleaseNotes';
import { ResolvedIssues } from './ResolvedIssues';
import { VersionClaimedByAnotherCommit } from './VersionClaimedByAnotherCommit';

/**
 * The post step of the action. Creates the GitHub release for the decision the main step recorded.
 *
 * It never works the version out for itself: the main step is the single place that decides whether anything
 * should be released at all, and this step only carries that decision out.
 */
export class HandleRelease {

    constructor(
        readonly _releases: IReleases,
        readonly _decisions: IReleaseDecisions,
        readonly _issues: IIssues,
        readonly _context: IActionContext,
        readonly _logger: ILogger,
        readonly _closeResolvedIssues: boolean = true) {
    }

    async run(): Promise<void> {
        const decision = this._decisions.read();
        if (!decision) {
            this._logger.info('The main step did not record a release decision - no release will be created.');
            return;
        }

        if (!decision.shouldCreateRelease) {
            this._logger.info('The main step decided that no GitHub release should be created for this run.');
            return;
        }

        await this.createRelease(decision);
    }

    private async createRelease(decision: ReleaseDecision): Promise<void> {
        const tag = decision.tag;
        const targetCommitish = decision.targetCommitish || this._context.sha;

        // The version can already be taken: by this commit when a parallel job got there first, or by another
        // commit when a concurrent run worked out the same version and created its release first. Only the first
        // is safe to skip - the second has to fail the run, or it goes on as though it had released.
        const existingTarget = await this._releases.targetOf(tag);
        if (existingTarget !== undefined) {
            if (existingTarget !== targetCommitish) {
                throw new VersionClaimedByAnotherCommit(tag, existingTarget, targetCommitish);
            }

            this._logger.warn(`A release for '${tag}' already exists for this commit - skipping.`);
            return;
        }

        if (await this._releases.existsForSha(targetCommitish)) {
            this._logger.warn(`A release for commit '${targetCommitish}' already exists - skipping.`);
            return;
        }

        this._logger.info(`Creating release '${tag}' for commit '${targetCommitish}'.`);

        const notes = ReleaseNotes.withoutComments(decision.releaseNotes);

        await this._releases.create({
            tag,
            name: `Release ${tag}`,
            notes,

            // With no notes of our own, let GitHub compose them from the merged pull requests rather than
            // cutting a release with an empty body. A description holding nothing but the template's comment
            // counts as no notes.
            generateNotes: notes.trim() === '',
            isPrerelease: decision.isPrerelease,
            targetCommitish
        });

        this._logger.info('GitHub release created.');

        await this.closeResolvedIssues(tag, notes);
    }

    /**
     * Closes the issues the release notes say this release resolves.
     *
     * Done after the release exists, and never allowed to fail the step. The release is the thing that had to
     * happen; an issue left open because the API refused is a tidiness problem, while a step that fails after
     * publishing makes the run look as though nothing shipped.
     *
     * Read from the published notes, so an issue named only inside a comment the release does not show is not
     * closed by it.
     */
    private async closeResolvedIssues(tag: string, notes: string): Promise<void> {
        if (!this._closeResolvedIssues) {
            return;
        }

        const resolved = ResolvedIssues.in(notes);
        if (resolved.length === 0) {
            return;
        }

        this._logger.info(`The release notes name ${resolved.length} issue(s) as resolved: ${resolved.map(_ => `#${_}`).join(', ')}.`);

        for (const issue of resolved) {
            try {
                const closed = await this._issues.close(
                    issue,
                    `Closed by release **${tag}**.`);

                if (closed) {
                    this._logger.info(`Closed #${issue}.`);
                }
            } catch (ex) {
                this._logger.warn(`Could not close #${issue} - leaving it open.`);
                this._logger.warn(ex);
            }
        }
    }
}
