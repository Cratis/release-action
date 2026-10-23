// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { PullRequest } from './PullRequest';

/** Collects merged pull requests on the first-parent range since the latest stable release tag. */
export interface IPendingPullRequests {
    get(upper: string): Promise<{ pullRequests: PullRequest[]; fallback: boolean }>;
}
