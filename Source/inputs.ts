import { getInput } from '@actions/core';

const gitHubToken: string | null = getInput('github-token') || null;
const version: string | null = getInput('version') || null;
const releaseNotes: string | null = getInput('release-notes') || null;

export default {
    gitHubToken,
    version,
    releaseNotes
};
