import { afterEach, beforeEach, describe, it } from 'vitest';

import { inputs } from '../inputs';

// `@actions/core` reads an input `some-name` from `INPUT_SOME-NAME`.
const set = (name: string, value: string) => { process.env[`INPUT_${name.toUpperCase()}`] = value; };
const clear = (name: string) => { delete process.env[`INPUT_${name.toUpperCase()}`]; };
const names = ['major-labels', 'minor-labels', 'patch-labels', 'tag-prefix'];

describe('when reading configured inputs', () => {
    beforeEach(() => {
        set('major-labels', 'breaking, big change');
        set('minor-labels', 'feature,enhancement');
        set('tag-prefix', 'release-');
        clear('patch-labels');
    });

    afterEach(() => names.forEach(clear));

    it('should split a label list on commas and trim each name', () => {
        inputs.majorLabels.should.deep.equal(['breaking', 'big change']);
    });

    it('should split a label list without spaces', () => {
        inputs.minorLabels.should.deep.equal(['feature', 'enhancement']);
    });

    it('should fall back to the canonical label when a list is not configured', () => {
        inputs.patchLabels.should.deep.equal(['patch']);
    });

    it('should read the configured tag prefix', () => {
        inputs.tagPrefix.should.equal('release-');
    });
});

describe('when reading inputs that are not configured', () => {
    beforeEach(() => names.forEach(clear));
    afterEach(() => names.forEach(clear));

    it('should default the tag prefix to v', () => {
        inputs.tagPrefix.should.equal('v');
    });

    it('should default the major labels to major', () => {
        inputs.majorLabels.should.deep.equal(['major']);
    });
});

describe('when reading the token, version and release notes inputs', () => {
    const scalarNames = ['github-token', 'version', 'release-notes'];

    beforeEach(() => {
        set('github-token', 'a-secret-token');
        set('version', '  3.4.5  ');
        set('release-notes', 'The notes');
    });

    afterEach(() => scalarNames.forEach(clear));

    it('should read the token', () => {
        inputs.gitHubToken.should.equal('a-secret-token');
    });

    it('should trim the version', () => {
        inputs.version.should.equal('3.4.5');
    });

    it('should read the release notes', () => {
        inputs.releaseNotes.should.equal('The notes');
    });
});
