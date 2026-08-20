import { getInput } from '@actions/core';

import { IInputs } from './IInputs';

const parseLabels = (raw: string, fallback: string): string[] => {
    const labels = raw.split(',').map(label => label.trim()).filter(label => label.length > 0);
    return labels.length > 0 ? labels : [fallback];
};

/**
 * The inputs of the action. Read lazily so that they always reflect the environment at the time they are used.
 */
export const inputs: IInputs = {
    get gitHubToken() {
        return getInput('github-token');
    },

    get version() {
        return getInput('version').trim();
    },

    get releaseNotes() {
        return getInput('release-notes');
    },

    get tagPrefix() {
        return getInput('tag-prefix') || 'v';
    },

    get majorLabels() {
        return parseLabels(getInput('major-labels'), 'major');
    },

    get minorLabels() {
        return parseLabels(getInput('minor-labels'), 'minor');
    },

    get patchLabels() {
        return parseLabels(getInput('patch-labels'), 'patch');
    },

    get closeResolvedIssues() {
        // Absent means on. The references are already in the notes and already mean "this release delivers
        // that issue", so the useful default is to act on them; a repository that does not want it says so.
        return getInput('close-resolved-issues').trim().toLowerCase() !== 'false';
    }
};
