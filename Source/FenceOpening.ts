// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

/** The opening line and matching criteria of a fenced Markdown block. */
export type FenceOpening = {
    firstLineEnd: number;
    depth: number;
    contentColumn: number;
    afterOpening: number;
    kind: string;
    closing: RegExp;
};
