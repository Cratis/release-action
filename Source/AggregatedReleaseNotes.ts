// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { ILogger } from './ILogger';
import { IReleaseOptions } from './IReleaseOptions';
import { PullRequest, isFromDependabot } from './PullRequest';
import { ReleaseNotes } from './ReleaseNotes';

/** Keeps the net effect of revert chains and merges whole release-note bullets, never their issue references. */
export class AggregatedReleaseNotes {
    private static readonly sections = ['Added', 'Changed', 'Fixed', 'Removed', 'Security', 'Deprecated'];

    static intents(pullRequest: PullRequest, options: IReleaseOptions): string[] {
        const intents: [string, readonly string[]][] = [
            ['major', options.majorLabels], ['minor', options.minorLabels],
            ['patch', options.patchLabels], ['no-release', options.noReleaseLabels]
        ];
        return intents.filter(([, names]) => pullRequest.labels.some(label => names.includes(label.name ?? '')))
            .map(([intent]) => intent);
    }

    static included(pullRequests: PullRequest[], repository: string, options: IReleaseOptions): PullRequest[] {
        for (const pullRequest of pullRequests) {
            if (!isFromDependabot(pullRequest) && this.intents(pullRequest, options).length > 1) {
                throw new Error(`Pull request #${pullRequest.number} carries more than one release intent.`);
            }
        }
        return this.netEffects(pullRequests, repository).filter(pullRequest =>
            !isFromDependabot(pullRequest) && !this.intents(pullRequest, options).includes('no-release'));
    }

    private static netEffects(pullRequests: PullRequest[], repository: string): PullRequest[] {
        const effects = new Map<number, { root: number; sign: number }>();
        const totals = new Map<number, number>();
        for (const [index, pullRequest] of pullRequests.entries()) {
            const reference = (pullRequest.body ?? '').match(/^Reverts ([\w.-]+\/[\w.-]+)#(\d+)\.?\s*$/m);
            const revertedSha = (pullRequest.body ?? '').match(/This reverts commit ([0-9a-f]{40})\b/i)?.[1];
            const original = pullRequests.slice(0, index).find(candidate =>
                (reference && reference[1].toLowerCase() === repository.toLowerCase() && candidate.number === Number(reference[2])) ||
                (revertedSha && candidate.merge_commit_sha === revertedSha));
            const prior = original && effects.get(original.number);
            const effect = prior ? { root: prior.root, sign: -prior.sign } : { root: pullRequest.number, sign: 1 };
            effects.set(pullRequest.number, effect);
            totals.set(effect.root, (totals.get(effect.root) ?? 0) + effect.sign);
        }
        return pullRequests.filter(pullRequest => effects.get(pullRequest.number)?.root === pullRequest.number &&
            (totals.get(pullRequest.number) ?? 0) > 0);
    }

    static merge(pullRequests: PullRequest[], logger: ILogger): string {
        if (pullRequests.length === 1) return pullRequests[0].body ?? '';
        const collected = new Map(['Summary', ...this.sections].map(section => [section, [] as string[]]));
        const references = new Map<string, string>();
        for (const pullRequest of pullRequests) {
            const sections = this.collect(pullRequest, references, logger);
            for (const [section, lines] of sections) {
                const content = lines.join('\n').trim();
                if (content) collected.get(section)?.push(content);
            }
        }
        if (pullRequests.length) this.requireSections(collected);
        const merged = [...collected].filter(([, contents]) => contents.length)
            .map(([section, contents]) => `## ${section}\n\n${contents.join('\n\n')}`).join('\n\n');
        const definitions = [...references.values()].join('\n');
        return ReleaseNotes.withoutComments([merged, definitions].filter(Boolean).join('\n\n'));
    }

    private static collect(pullRequest: PullRequest, references: Map<string, string>, logger: ILogger): Map<string, string[]> {
        const collected = new Map(this.sections.map(section => [section, [] as string[]]));
        const summary: string[] = [];
        collected.set('Summary', summary);
        let current: string[] | undefined = summary;
        let fence: string | undefined;
        let inBullet = false;
        let previousBlank = false;
        for (const line of ReleaseNotes.withoutComments(pullRequest.body ?? '').split('\n')) {
            const afterBlank = previousBlank;
            previousBlank = !line.trim();
            const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
            if (marker && (!fence || (marker[1][0] === fence[0] && marker[1].length >= fence.length))) {
                fence = fence ? undefined : marker[1];
            }
            const outsideFence = !fence && !marker;
            if (outsideFence && this.collectReference(line, references, pullRequest.number, logger)) {
                inBullet = false;
                continue;
            }
            const heading = outsideFence && line.match(/^##\s+(.+?)\s*#*\s*$/);
            if (heading) {
                current = collected.get(heading[1]);
                if (!current && heading[1] !== 'Summary') logger.warn(`PR #${pullRequest.number}: dropping unknown release-note section "${heading[1]}".`);
                inBullet = false;
            } else if (current === summary) {
                summary.push(line);
            } else if (current) {
                inBullet = this.collectBulletLine(line, current, { inBullet, outsideFence, afterBlank });
            }
        }
        return collected;
    }

    private static requireSections(collected: Map<string, string[]>): void {
        if (!this.sections.some(section => collected.get(section)?.length)) {
            throw new Error('No release-note sections found for the pending pull requests.');
        }
    }

    private static collectReference(line: string, references: Map<string, string>, number: number, logger: ILogger): boolean {
        const reference = line.match(/^ {0,3}\[([^\]]+)\]:\s*\S.*$/);
        if (!reference) return false;
        const label = reference[1].trim().replace(/\s+/g, ' ').toLowerCase();
        if (references.has(label)) {
            logger.warn(`PR #${number}: duplicate release-note reference label "${reference[1]}"; keeping the first definition.`);
        } else {
            references.set(label, line);
        }
        return true;
    }

    private static collectBulletLine(line: string, current: string[], state: {
        inBullet: boolean; outsideFence: boolean; afterBlank: boolean;
    }): boolean {
        if (!state.outsideFence) {
            if (state.inBullet) current.push(line);
            return state.inBullet;
        }
        if (!line.trim()) {
            current.push(line);
            return state.inBullet;
        }
        if (/^###\s/.test(line)) {
            current.push(line);
            return false;
        }
        if (/^\s*(?:[-+*]|\d+[.)])\s+/.test(line)) {
            current.push(line);
            return true;
        }
        if (state.inBullet && this.isBulletContinuation(line, state.afterBlank)) {
            current.push(line);
            return true;
        }
        return false;
    }

    private static isBulletContinuation(line: string, afterBlank: boolean): boolean {
        return /^(?: {2,}|\t)/.test(line) || !afterBlank;
    }
}
