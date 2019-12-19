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

/* eslint import/no-extraneous-dependencies: ["error", {
  "devDependencies": false,
  "optionalDependencies": true,
  "peerDependencies": false
}] */

describe('safeRequest', () => {
  const { pid } = process;
  let heapdump;

  jest.spyOn(process, 'on').mockImplementation(() => {});
  jest.spyOn(Date, 'now').mockImplementation(() => 1525145998246);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  function load({ heapdumpRequireError = false, heapdumpOptions = 'nosignal' } = {}) {
    jest.resetModules();

    if (heapdumpOptions) {
      process.env.NODE_HEAPDUMP_OPTIONS = heapdumpOptions;
    } else {
      delete process.env.NODE_HEAPDUMP_OPTIONS;
    }

    jest.doMock('heapdump', () => {
      if (heapdumpRequireError) {
        throw new Error('unable to resolve heapdump');
      }
      return { writeSnapshot: jest.fn() };
    }, { virtual: true });

    if (!heapdumpRequireError) {
      heapdump = require('heapdump'); // eslint-disable-line import/no-unresolved
    } else {
      heapdump = null;
    }

    return require('../../../src/server/utils/heapdump');
  }

  it('warns when unable to import the heapdump package', () => {
    console.warn.mockClear();
    process.on.mockClear();
    load({ heapdumpRequireError: true });
    expect(process.on).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn.mock.calls[0][0]).toEqual('unable to setup writing heapdumps');
  });

  it('warns with the error message when unable to import the heapdump package in development', () => {
    console.warn.mockClear();
    process.on.mockClear();
    process.env.NODE_ENV = 'development';
    load({ heapdumpRequireError: true });
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn.mock.calls[0][1]).toEqual('unable to resolve heapdump');
  });

  it('warns with the error when unable to import the heapdump package in production', () => {
    console.warn.mockClear();
    process.on.mockClear();
    process.env.NODE_ENV = 'production';
    load({ heapdumpRequireError: true });
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn.mock.calls[0][1]).toBeInstanceOf(Error);
  });

  it('attaches to the SIGUSR2 signal', () => {
    process.on.mockClear();
    load();
    expect(process.on).toHaveBeenCalledTimes(1);
    expect(process.on.mock.calls[0][0]).toBe('SIGUSR2');
  });

  it('does not attach to the SIGUSR2 signal when options are customized', () => {
    console.warn.mockClear();
    process.on.mockClear();
    load({ heapdumpOptions: '' });
    expect(process.on).not.toHaveBeenCalled();
  });

  describe('on SIGUSR2 signal', () => {
    it('warns about writing a heapdump', () => {
      process.on.mockClear();
      console.warn.mockClear();
      load();
      expect(process.on).toHaveBeenCalledTimes(1);
      process.on.mock.calls[0][1]();
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn.mock.calls[0][0]).toBe(`about to write a heapdump to /tmp/heapdump-${pid}-1525145998246.heapsnapshot`);
    });

    it('attempts to write a heapdump', () => {
      process.on.mockClear();
      load();
      expect(process.on).toHaveBeenCalledTimes(1);
      process.on.mock.calls[0][1]();
      expect(heapdump.writeSnapshot).toHaveBeenCalledTimes(1);
      expect(heapdump.writeSnapshot.mock.calls[0][0]).toBe(`/tmp/heapdump-${pid}-1525145998246.heapsnapshot`);
    });

    describe('writing the heapdump', () => {
      const writtenFilename = '/t/m/p/heapsnapshot';

      it('notifies about an error encountered at level error', () => {
        process.on.mockClear();
        console.error.mockClear();
        load();
        expect(process.on).toHaveBeenCalledTimes(1);
        process.on.mock.calls[0][1]();
        expect(heapdump.writeSnapshot).toHaveBeenCalledTimes(1);
        const err = new Error('sample test error');
        heapdump.writeSnapshot.mock.calls[0][1](err, writtenFilename);
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error.mock.calls[0][0]).toBe('unable to write heapdump /t/m/p/heapsnapshot');
        expect(console.error.mock.calls[0][1]).toBe(err);
      });

      it('notifies about finishing at level warn', () => {
        process.on.mockClear();
        load();
        expect(process.on).toHaveBeenCalledTimes(1);
        process.on.mock.calls[0][1]();
        expect(heapdump.writeSnapshot).toHaveBeenCalledTimes(1);

        console.warn.mockClear();
        heapdump.writeSnapshot.mock.calls[0][1](null, writtenFilename);
        expect(console.warn).toHaveBeenCalledTimes(1);
        expect(console.warn.mock.calls[0][0]).toBe('wrote heapdump out to /t/m/p/heapsnapshot');
      });
    });
  });
});
