import { Label } from './Label';

// https://docs.github.com/en/graphql/reference/objects#pullrequest

export type Branch = {
    ref: string
};

export type PullRequest = {
    labels: Label[];
    body: string | null;
    url: string;
    html_url: string;
    number: number;
    base: Branch;
    head: Branch;
    state: string;
    draft?: boolean;
};
