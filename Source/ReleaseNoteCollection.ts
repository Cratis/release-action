// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { ILogger } from './ILogger';

/** State retained while collecting one pull request's release-note lines. */
export type ReleaseNoteCollection = {
    sections: Map<string, string[]>;
    summary: string[];
    current: string[] | undefined;
    fence: string | undefined;
    inBullet: boolean;
    previousBlank: boolean;
    references: Map<string, string>;
    number: number;
    logger: ILogger;
};
