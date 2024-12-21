import { Label } from './Label';
export type Branch = {
    ref: string;
};
export type Actor = {
    login: string;
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
    author?: Actor;
};
