/*
 * Copyright 2019 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

const originalSetImmediate = setImmediate;
const flushPromises = () => new Promise(originalSetImmediate);

let shutdownOtelLogger;

describe('shutdown', () => {
  jest.spyOn(global, 'setTimeout').mockImplementation(() => {});
  jest.spyOn(global, 'setImmediate').mockImplementation(() => {});
  jest.spyOn(process, 'exit').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  const signalNames = [
    'SIGINT',
    'SIGTERM',
  ];

  function load() {
    jest.resetModules();
    jest.mock('../../src/server/utils/logging/otel/logger');
    ({ shutdownOtelLogger } = require('../../src/server/utils/logging/otel/logger'));
    return require('../../src/server/shutdown');
  }

  beforeEach(() => {
    jest.clearAllMocks();
    signalNames.forEach((signalName) => process.removeAllListeners(signalName));
  });

  it('shutdown calls the close property of servers added', async () => {
    const close = jest.fn();
    const { addServer, shutdown } = load();
    addServer({ close });
    expect(close).not.toHaveBeenCalled();
    await shutdown();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('shutdown logs to the console', async () => {
    const { shutdown } = load();
    await shutdown();
    expect(console.log).toHaveBeenCalled();
    expect(console.log.mock.calls).toMatchSnapshot();
  });

  it('shuts down the OTel logger', async () => {
    const { shutdown } = load();
    await shutdown();
    expect(shutdownOtelLogger).toHaveBeenCalledTimes(1);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('logs when there is an error shutting down the OTel logger', async () => {
    const { shutdown } = load();
    const error = new Error('logger failed to shut down');
    shutdownOtelLogger.mockImplementationOnce(() => Promise.reject(error));
    await shutdown();
    expect(shutdownOtelLogger).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(error);
  });

  signalNames.forEach((signalName) => {
    describe(`${signalName}`, () => {
      it('calls shutdown', async () => {
        const close = jest.fn();
        const { addServer } = load();
        addServer({ close });
        expect(close).not.toHaveBeenCalled();
        process.emit(signalName);
        await flushPromises();
        expect(close).toHaveBeenCalledTimes(1);
      });

      it('calls process.exit async when sent twice', async () => {
        load();
        process.emit(signalName);
        await flushPromises();
        expect(process.exit).not.toHaveBeenCalled();
        process.emit(signalName);
        await flushPromises();
        expect(setImmediate).toHaveBeenCalled();
        setImmediate.mock.calls[0][0]();
        expect(process.exit).toHaveBeenCalledTimes(1);
      });

      it('writes an error message when calling process.exit', async () => {
        load();
        process.emit(signalName);
        await flushPromises();
        expect(console.error).not.toHaveBeenCalled();
        process.emit(signalName);
        await flushPromises();
        expect(setImmediate).toHaveBeenCalled();
        setImmediate.mock.calls[0][0]();
        expect(console.error).toHaveBeenCalled();
        expect(console.error.mock.calls).toMatchSnapshot();
      });

      it('forcibly exits if still running later on', async () => {
        // babel-node bug, fixed but not yet published
        load();
        process.emit(signalName);
        await flushPromises();
        expect(process.exit).not.toHaveBeenCalled();
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout.mock.calls[0][1]).toMatchSnapshot();
        setTimeout.mock.calls[0][0]();
        expect(setImmediate).toHaveBeenCalled();
        setImmediate.mock.calls[0][0]();
        expect(process.exit).toHaveBeenCalledTimes(1);
      });

      it('writes an error message if still running later on', async () => {
        // babel-node bug, fixed but not yet published
        load();
        process.emit(signalName);
        await flushPromises();
        expect(console.error).not.toHaveBeenCalled();
        expect(setTimeout).toHaveBeenCalledTimes(1);
        setTimeout.mock.calls[0][0]();
        expect(console.error).toHaveBeenCalled();
        expect(console.error.mock.calls).toMatchSnapshot();
      });

      it('uses node unref to prevent the exit timeout from preventing exiting', async () => {
        const unref = jest.fn();
        setTimeout.mockImplementationOnce(() => ({ unref }));

        load();
        process.emit(signalName);
        await flushPromises();
        expect(process.exit).not.toHaveBeenCalled();
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(unref).toHaveBeenCalledTimes(1);
      });
    });
  });
});
