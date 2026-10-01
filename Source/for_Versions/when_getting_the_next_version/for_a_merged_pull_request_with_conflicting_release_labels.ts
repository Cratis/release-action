import { beforeEach, describe, it } from 'vitest';

import { IReleaseOptions } from '../../IReleaseOptions';
import { VersionInfo } from '../../VersionInfo';
import { Versions } from '../../Versions';
import { Label } from '../../Label';
import { RecordingLogger } from '../../specs/RecordingLogger';
import { aPullRequest } from '../../specs/aPullRequest';
import { someReleases } from '../../specs/someReleases';

// More than one release intent cannot be settled by the action: `no-release` winning releases nothing without
// saying why, and the highest bump winning releases a version nobody chose. Both are reported as an error.
const mergedWith = (labels: Label[]) => aPullRequest({
    state: 'closed',
    merged: true,
    merged_at: '2026-07-23T10:00:00Z',
    labels
});

for (const names of [['no-release', 'patch'], ['minor', 'no-release'], ['patch', 'major'], ['major', 'minor', 'patch']]) {
    describe(`when getting the next version for a merged pull request labelled ${names.join(' and ')}`, () => {
        let logger: RecordingLogger;
        let result: VersionInfo;

        beforeEach(async () => {
            logger = new RecordingLogger();
            const versions = new Versions(someReleases(), logger);

            result = await versions.getNextVersionFor(mergedWith([...names.map(name => ({ name })), { name: 'documentation' }]));
        });

        it('should not be a release', () => {
            result.isRelease.should.be.false;
        });

        it('should give the error reason', () => {
            result.reason?.should.equal('error');
        });

        it('should name the conflicting intents', () => {
            logger.messages.some(message => message.includes('more than one release intent')).should.be.true;
        });

        it('should log every label', () => {
            for (const name of [...names, 'documentation']) {
                logger.messages.should.include(`  - ${name}`);
            }
        });
    });
}

describe('when getting the next version for a merged pull request with two labels configured for the same intent', () => {
    let result: VersionInfo;

    beforeEach(async () => {
        const options: IReleaseOptions = {
            tagPrefix: 'v',
            majorLabels: ['major'],
            minorLabels: ['minor', 'feature'],
            patchLabels: ['patch'],
            noReleaseLabels: ['no-release']
        };
        const versions = new Versions(someReleases(), new RecordingLogger(), options);

        result = await versions.getNextVersionFor(mergedWith([{ name: 'minor' }, { name: 'feature' }]));
    });

    it('should release the one intent they share', () => {
        result.version?.version.should.equal('1.3.0');
    });
});
