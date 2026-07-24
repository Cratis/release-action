import { IActionContext } from './IActionContext';
import { ILogger } from './ILogger';
import { IReleaseDecisions } from './IReleaseDecisions';
import { IReleases } from './IReleases';
import { ReleaseDecision } from './ReleaseDecision';

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
        readonly _context: IActionContext,
        readonly _logger: ILogger) {
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
    }
}
