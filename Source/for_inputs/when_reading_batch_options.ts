// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { afterEach, describe, it } from 'vitest';

import { inputs } from '../inputs';

const names = ['INPUT_RELEASE-WINDOW', 'INPUT_HOTFIX-LABELS'];
const previous = names.map(name => process.env[name]);
afterEach(() => names.forEach((name, index) => {
    if (previous[index] === undefined) delete process.env[name];
    else process.env[name] = previous[index];
}));

describe('when reading batching inputs', () => {
    it('should default to the unchanged single-PR path and hotfix label', () => {
        delete process.env[names[0]];
        delete process.env[names[1]];
        inputs.should.have.property('releaseWindow', 0);
        inputs.should.have.property('hotfixLabels').that.deep.equal(['hotfix']);
    });
    it('should accept fractional minutes and comma-separated custom hotfix labels', () => {
        process.env[names[0]] = '1.5';
        process.env[names[1]] = ' urgent, hot-fix ';
        inputs.should.have.property('releaseWindow', 1.5);
        inputs.should.have.property('hotfixLabels').that.deep.equal(['urgent', 'hot-fix']);
    });
    for (const value of ['-1', 'NaN', 'Infinity', 'tomorrow']) {
        it(`should reject the invalid window ${value}`, () => {
            process.env[names[0]] = value;
            (() => inputs.releaseWindow).should.throw('non-negative number of minutes');
        });
    }
});
