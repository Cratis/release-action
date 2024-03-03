import { getInput } from '@actions/core';

const gitHubToken: string | null = getInput('github-token') || null;

export default {
    gitHubToken
};
