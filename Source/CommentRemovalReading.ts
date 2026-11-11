// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

/** Forward-only state for one interpretation of Markdown's ambiguous fences. */
export type CommentRemovalReading = {
    notes: string;
    index: number;
    published: string;
    unclosedFrom: number;
    removals: [number, number][];
    lineStart: number;
    lineScannedTo: number;
    unclosedFences: Set<string>;
    outdentedFenceCloses: boolean;
};
