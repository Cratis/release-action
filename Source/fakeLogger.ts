import sinon from 'sinon';
import { createLogger } from 'winston';

const fakeLogger = createLogger();
fakeLogger.info = sinon.stub() as any;
fakeLogger.error = sinon.stub() as any;

export default fakeLogger;


