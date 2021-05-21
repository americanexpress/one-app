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

import util from 'util';

jest.mock('../../../../src/server/utils/readJsonFile', () => () => ({ buildVersion: '1.2.3-abc123' }));
jest.mock('os', () => ({
  hostname: jest.fn(() => 'host-123'),
  type: jest.fn(() => 'Darwin'),
  arch: jest.fn(() => 'x64'),
}));

function createErrorWithMockedStacktrace(msg) {
  const err = new Error(msg);
  err.stack = `Error: test error
  at Object.<anonymous> (one-app/__tests__/server/utils/logging/production-formatter.spec.js:36:64)
  at Object.asyncFn (one-app/node_modules/jest-jasmine2/build/jasmine_async.js:124:345)
  at resolve (one-app/node_modules/jest-jasmine2/build/queue_runner.js:46:12)
  at new Promise (<anonymous>)
  at mapper (one-app/node_modules/jest-jasmine2/build/queue_runner.js:34:499)
  at promise.then (one-app/node_modules/jest-jasmine2/build/queue_runner.js:74:39)
  at <anonymous>
  at process._tickCallback (internal/process/next_tick.js:188:7)`;

  return err;
}

describe('production-formatter', () => {
  let formatter;
  jest.spyOn(Date.prototype, 'toISOString').mockImplementation(() => '2018-03-02T02:39:32.948Z');
  jest.spyOn(util, 'format');

  function load(pid) {
    jest.resetModules();

    Object.defineProperty(process, 'pid', {
      writable: true,
      value: pid || 1234,
    });
    formatter = require('../../../../src/server/utils/logging/production-formatter').default;
  }

  it('is a function', () => {
    load();
    expect(typeof formatter).toBe('function');
  });

  it('encodes as parseable JSON', () => {
    load();
    const entry = formatter('error', 1, 2, 3);
    expect(() => JSON.parse(entry)).not.toThrowError();
    expect(JSON.parse(entry)).toMatchSnapshot();
  });

  it('drops lower levels', () => {
    load();
    expect(formatter('debug', 1, 2, 3)).toBe(null);
  });

  describe('errors', () => {
    it('encodes as parseable JSON', () => {
      load();
      const entry = formatter('error', 'unable to do the thing', createErrorWithMockedStacktrace('test error'));
      expect(() => JSON.parse(entry)).not.toThrowError();
      expect(JSON.parse(entry)).toMatchSnapshot();
    });

    it('puts a lone error in the error field', () => {
      expect.assertions(2);
      load();
      const parsed = JSON.parse(formatter('error', createErrorWithMockedStacktrace('test error')));
      expect(parsed).toHaveProperty('error');
      expect(parsed.error).toMatchSnapshot();
    });

    it('does not include a message key when given a lone error', () => {
      expect.assertions(1);
      load();
      const parsed = JSON.parse(formatter('error', new Error('irrelevant')));
      expect(parsed).not.toHaveProperty('message');
    });

    it('puts an error with other arguments in the error field and uses only the other args for the message', () => {
      expect.assertions(4);
      load();
      const parsed = JSON.parse(formatter('error', createErrorWithMockedStacktrace('test error'), 'say hi %i times', 7));
      expect(parsed).toHaveProperty('error');
      expect(parsed).toHaveProperty('message');
      expect(parsed.error).toMatchSnapshot();
      expect(parsed.message).toBe('say hi 7 times');
    });

    it('puts an error paired with a message in the error field', () => {
      expect.assertions(4);
      load();
      const parsed = JSON.parse(formatter('error', 'unable to do the thing', createErrorWithMockedStacktrace('test error')));
      expect(parsed).toHaveProperty('error');
      expect(parsed).toHaveProperty('message');
      expect(parsed.error).toMatchSnapshot();
      expect(parsed.message).toBe('unable to do the thing');
    });

    it('uses the error in the message when the error is paired with a message and other arguments', () => {
      expect.assertions(4);
      load();
      const parsed = JSON.parse(formatter('error', 'unable to do the thing %O %d times', createErrorWithMockedStacktrace('test error'), 12));
      const errorText = parsed.message
        .replace('[', '')
        .replace(']', '');
      expect(parsed).toHaveProperty('error');
      expect(parsed).toHaveProperty('message');
      expect(parsed.error).toMatchSnapshot();
      expect(errorText).toMatchSnapshot();
    });

    it('records the error message as <none> if not present', () => {
      expect.assertions(2);
      load();
      const err = createErrorWithMockedStacktrace('test error');
      delete err.message;
      const parsed = JSON.parse(formatter('error', 'unable to do the thing', err));
      expect(parsed).toHaveProperty('error');
      expect(parsed.error).toHaveProperty('message', '<none>');
    });

    it('records the error stacktrace as <none> if not present', () => {
      expect.assertions(2);
      load();
      const err = createErrorWithMockedStacktrace('test error');
      delete err.stack;
      const parsed = JSON.parse(formatter('error', 'unable to do the thing', err));
      expect(parsed).toHaveProperty('error');
      expect(parsed.error).toHaveProperty('stacktrace', '<none>');
    });

    it('encodes ClientReportedError Error as parseable JSON', () => {
      function buildClientErrorEntry() {
        const error = new Error('something broke');
        Object.assign(error, {
          name: 'ClientReportedError',
          stack: 'Error: something broke\n    at methodA (resource-a.js:1:1)\n    at methodB (resource-b.js:1:1)\n',
          userAgent: 'Browser/5.0 (compatible; WXYZ 100.0; Doors LQ 81.4; Boat/1.0)',
          uri: 'https://example.com/page-the/error/occurred-on',
          metaData: {
            moduleID: 'healthy-frank',
            code: '500',
            collectionMethod: 'applicationError',
            correlationId: '123abc',
          },
        });
        return error;
      }

      load();
      const entry = formatter('error', buildClientErrorEntry());
      expect(() => JSON.parse(entry)).not.toThrowError();
      expect(JSON.parse(entry)).toMatchSnapshot();
    });

    it('encodes Server Reported Error as parseable JSON with nested metadata objects', () => {
      function buildServerSideErrorEntry() {
        const error = new Error('something broke');
        Object.assign(error, {
          stack: 'Error: something broke\n    at methodA (resource-a.js:1:1)\n    at methodB (resource-b.js:1:1)\n',
          metaData: {
            moduleID: 'healthy-frank',
            nestedObject: {
              level1: {
                level2: {
                  level3: {
                    level4: 'logs nested objects correctly',
                  },
                },
              },
            },
          },
        });
        return error;
      }

      load();
      const entry = formatter('error', buildServerSideErrorEntry());
      expect(() => JSON.parse(entry)).not.toThrowError();
      expect(JSON.parse(entry)).toMatchSnapshot();
    });
  });

  describe('types', () => {
    it('encodes request as parseable JSON', () => {
      function buildRequestEntry() {
        return {
          type: 'request',
          request: {
            direction: 'in',
            protocol: 'https',
            address: {
              url: 'https://example.org/server',
            },
            metaData: {
              method: 'GET',
              correlationId: '123',
              // null to explicitly signal no value, undefined if not expected for every request
              host: 'example.org',
              referrer: 'https://example.org/other-page',
              userAgent: 'Browser/8.0 (compatible; WXYZ 100.0; Doors LQ 81.4; Boat/1.0)',
              location: undefined,
            },
            timings: { // https://www.w3.org/TR/navigation-timing/
              // navigationStart: 0,
              // redirectStart: 0,
              // redirectEnd: 0,
              // fetchStart: 0,
              // domainLookupStart: 10,
              // domainLookupEnd: 20,
              // connectStart: 30,
              // secureConnectionStart: 40,
              // connectEnd: 50,
              // requestStart: 60,
              // requestEnd: 70, // optional? not part of the W3C spec
              // responseStart: 80,
              // responseEnd: 90,
              duration: 10,
              ttfb: 20,
            },
            statusCode: 200,
            statusText: 'OK',
          },
        };
      }

      load();
      const entry = formatter('error', buildRequestEntry());
      expect(() => JSON.parse(entry)).not.toThrowError();
      expect(JSON.parse(entry)).toMatchSnapshot();
    });

    it('uses the default util.format when given an unknown type', () => {
      load();
      util.format.mockClear();
      const entry = formatter('error', { type: 'yolo' });
      expect(util.format).toHaveBeenCalledTimes(1);
      expect(() => JSON.parse(entry)).not.toThrowError();
      expect(JSON.parse(entry)).toMatchSnapshot();
    });
  });
});
