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
        const collected = new Map(this.sections.map(section => [section, [] as string[]]));
        for (const pullRequest of pullRequests) {
            const sections = new Map(this.sections.map(section => [section, [] as string[]]));
            this.collect(pullRequest, sections, logger);
            for (const [section, lines] of sections) {
                const content = lines.join('\n').trim();
                if (content) collected.get(section)?.push(content);
            }
        }
        const merged = [...collected].filter(([, contents]) => contents.length)
            .map(([section, contents]) => `## ${section}\n\n${contents.join('\n\n')}`).join('\n\n');
        if (pullRequests.length && !merged) throw new Error('No release-note sections found for the pending pull requests.');
        return ReleaseNotes.withoutComments(merged);
    }

    private static collect(pullRequest: PullRequest, collected: Map<string, string[]>, logger: ILogger): void {
        let current: string[] | undefined;
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
            const heading = !fence && !marker && line.match(/^##\s+(.+?)\s*#*\s*$/);
            if (heading) {
                current = collected.get(heading[1]);
                if (!current && heading[1] !== 'Summary') logger.warn(`PR #${pullRequest.number}: dropping unknown release-note section "${heading[1]}".`);
                inBullet = false;
            } else if (current) {
                if (fence || marker) {
                    if (inBullet) current.push(line);
                } else if (!line.trim()) {
                    current.push(line);
                } else if (/^###\s/.test(line)) {
                    current.push(line);
                    inBullet = false;
                } else if (/^\s*(?:[-+*]|\d+[.)])\s+/.test(line)) {
                    current.push(line);
                    inBullet = true;
                } else if (inBullet && (/^(?: {2,}|\t)/.test(line) || !afterBlank)) {
                    current.push(line);
                } else {
                    inBullet = false;
                }
            }
        }
    }
}
