import { IActionContext } from './IActionContext';
import { IIssues } from './IIssues';
import { ILogger } from './ILogger';
import { IReleaseDecisions } from './IReleaseDecisions';
import { IReleases } from './IReleases';
import { ReleaseDecision } from './ReleaseDecision';
import { ResolvedIssues } from './ResolvedIssues';

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

        if (await this._releases.existsForTag(tag)) {
            this._logger.warn(`A release for '${tag}' already exists - skipping.`);
            return;
        }

        if (await this._releases.existsForSha(targetCommitish)) {
            this._logger.warn(`A release for commit '${targetCommitish}' already exists - skipping.`);
            return;
        }

        this._logger.info(`Creating release '${tag}' for commit '${targetCommitish}'.`);

        await this._releases.create({
            tag,
            name: `Release ${tag}`,
            notes: decision.releaseNotes,

            // With no notes of our own, let GitHub compose them from the merged pull requests rather than
            // cutting a release with an empty body.
            generateNotes: decision.releaseNotes.trim() === '',
            isPrerelease: decision.isPrerelease,
            targetCommitish
        });

        this._logger.info('GitHub release created.');

        await this.closeResolvedIssues(decision);
    }

    /**
     * Closes the issues the release notes say this release resolves.
     *
     * Done after the release exists, and never allowed to fail the step. The release is the thing that had to
     * happen; an issue left open because the API refused is a tidiness problem, while a step that fails after
     * publishing makes the run look as though nothing shipped.
     */
    private async closeResolvedIssues(decision: ReleaseDecision): Promise<void> {
        if (!this._closeResolvedIssues) {
            return;
        }

        const resolved = ResolvedIssues.in(decision.releaseNotes);
        if (resolved.length === 0) {
            return;
        }

        this._logger.info(`The release notes name ${resolved.length} issue(s) as resolved: ${resolved.map(_ => `#${_}`).join(', ')}.`);

        for (const issue of resolved) {
            try {
                const closed = await this._issues.close(
                    issue,
                    `Closed by release **${decision.tag}**.`);

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
