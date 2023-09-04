/*
 * Copyright 2023 American Express Travel Related Services Company, Inc.
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

import { PassThrough } from 'stream';
import deepmerge from 'deepmerge';
import pino from 'pino';
import baseConfig from '../../../../../src/server/utils/logging/config/base';

jest.mock('yargs', () => ({
  argv: {
    logLevel: 'trace',
  },
}));

jest.mock('os', () => ({
  hostname: () => 'mockHostname',
  type: () => 'mockType',
  arch: () => 'mockArch',
}));

jest.mock('../../../../../src/server/utils/readJsonFile', () => () => ({
  buildVersion: '1.2.3-abc123',
}));

jest.spyOn(Date, 'now').mockReturnValue(1691618794070);

let streamData = '';
const mockStream = new PassThrough();
mockStream.on('data', (d) => {
  streamData += d;
});
const resetStreamData = () => {
  streamData = '';
};
const readLog = () => {
  const entry = JSON.parse(streamData);
  resetStreamData();
  return entry;
};

describe('production logger', () => {
  let productionConfig;
  let pinoConfig;
  let logger;

  beforeAll(() => {
    Object.defineProperty(process, 'pid', {
      writable: true,
      value: 1234,
    });
    productionConfig = require('../../../../../src/server/utils/logging/config/production').default;
    pinoConfig = deepmerge(baseConfig, productionConfig);
    logger = pino(pinoConfig, mockStream);
  });

  beforeEach(() => resetStreamData());
  afterAll(() => mockStream.destroy());

  it('should add the expected base data', () => {
    logger.log('hello, word');
    expect(readLog()).toMatchInlineSnapshot(`
      {
        "application": {
          "name": "One App",
          "version": "1.2.3-abc123",
        },
        "device": {
          "agent": "mockType mockArch",
          "id": "mockHostname:1234",
        },
        "level": "notice",
        "message": "hello, word",
        "schemaVersion": "0.3.0",
        "timestamp": "2023-08-09T22:06:34.070Z",
      }
    `);
  });

  it('should serialize an error', () => {
    const error = new Error('mock error');
    error.stack = 'mock stack';
    logger.error(error);
    expect(readLog()).toMatchInlineSnapshot(`
      {
        "application": {
          "name": "One App",
          "version": "1.2.3-abc123",
        },
        "device": {
          "agent": "mockType mockArch",
          "id": "mockHostname:1234",
        },
        "error": {
          "message": "mock error",
          "name": "Error",
          "stacktrace": "mock stack",
        },
        "level": "error",
        "message": "mock error",
        "schemaVersion": "0.3.0",
        "timestamp": "2023-08-09T22:06:34.070Z",
      }
    `);
  });

  it('should serialize an error with a missing message and stacktrace', () => {
    const error = new Error();
    delete error.stack;
    logger.error(error);
    expect(readLog()).toMatchInlineSnapshot(`
      {
        "application": {
          "name": "One App",
          "version": "1.2.3-abc123",
        },
        "device": {
          "agent": "mockType mockArch",
          "id": "mockHostname:1234",
        },
        "error": {
          "message": "<none>",
          "name": "Error",
          "stacktrace": "<none>",
        },
        "level": "error",
        "message": "",
        "schemaVersion": "0.3.0",
        "timestamp": "2023-08-09T22:06:34.070Z",
      }
    `);
  });

  it('should map the log level to the schema level', () => {
    logger.error();
    expect(readLog().level).toBe('error');
    logger.warn();
    expect(readLog().level).toBe('warning');
    logger.log();
    expect(readLog().level).toBe('notice');
    logger.info();
    expect(readLog().level).toBe('info');
    logger.debug();
    expect(readLog().level).toBe('debug');
    logger.trace();
    expect(readLog().level).toBe('trace');
  });

  describe('logMethod hook', () => {
    const mockError = new Error('mockError');
    delete mockError.stack;

    it('should take an error from the end of a log call and put it in the error key', () => {
      logger.error('This is a %s', 'test', mockError);
      expect(readLog()).toMatchInlineSnapshot(`
        {
          "application": {
            "name": "One App",
            "version": "1.2.3-abc123",
          },
          "device": {
            "agent": "mockType mockArch",
            "id": "mockHostname:1234",
          },
          "error": {
            "message": "mockError",
            "name": "Error",
            "stacktrace": "<none>",
          },
          "level": "error",
          "message": "This is a test",
          "schemaVersion": "0.3.0",
          "timestamp": "2023-08-09T22:06:34.070Z",
        }
      `);
    });

    it('should take an error from the beginning of a log call and put it in the error key', () => {
      logger.warn(mockError, 'This is another %s', 'test');
      expect(readLog()).toMatchInlineSnapshot(`
        {
          "application": {
            "name": "One App",
            "version": "1.2.3-abc123",
          },
          "device": {
            "agent": "mockType mockArch",
            "id": "mockHostname:1234",
          },
          "error": {
            "message": "mockError",
            "name": "Error",
            "stacktrace": "<none>",
          },
          "level": "warning",
          "message": "This is another test",
          "schemaVersion": "0.3.0",
          "timestamp": "2023-08-09T22:06:34.070Z",
        }
      `);
    });

    it('should not change log calls that do not begin or end with errors', () => {
      logger.info('This is a third %s', 'test');
      expect(readLog()).toMatchInlineSnapshot(`
        {
          "application": {
            "name": "One App",
            "version": "1.2.3-abc123",
          },
          "device": {
            "agent": "mockType mockArch",
            "id": "mockHostname:1234",
          },
          "level": "info",
          "message": "This is a third test",
          "schemaVersion": "0.3.0",
          "timestamp": "2023-08-09T22:06:34.070Z",
        }
      `);
    });
  });

  describe('log formatter', () => {
    it('encodes ClientReportedError Error', () => {
      function buildClientErrorEntry() {
        const error = new Error('something broke');
        Object.assign(error, {
          name: 'ClientReportedError',
          stack:
            'Error: something broke\n    at methodA (resource-a.js:1:1)\n    at methodB (resource-b.js:1:1)\n',
          userAgent: 'Browser/5.0 (compatible; WXYZ 100.0; Doors LQ 81.4; Boat/1.0)',
          uri: 'https://example.com/page-the/error/occurred-on',
          metaData: {
            moduleID: 'healthy-frank',
            code: '500',
            collectionMethod: 'applicationError',
            correlationId: '123abc',
          },
        });
        return { error };
      }
      logger.warn(buildClientErrorEntry());
      expect(readLog()).toMatchInlineSnapshot(`
        {
          "application": {
            "name": "One App",
            "version": "1.2.3-abc123",
          },
          "device": {
            "agent": "Browser/5.0 (compatible; WXYZ 100.0; Doors LQ 81.4; Boat/1.0)",
          },
          "error": {
            "message": "something broke",
            "name": "ClientReportedError",
            "stacktrace": "Error: something broke
            at methodA (resource-a.js:1:1)
            at methodB (resource-b.js:1:1)
        ",
          },
          "level": "warning",
          "message": "something broke",
          "request": {
            "address": {
              "uri": "https://example.com/page-the/error/occurred-on",
            },
            "metaData": {
              "code": "500",
              "collectionMethod": "applicationError",
              "correlationId": "123abc",
              "moduleID": "healthy-frank",
            },
          },
          "schemaVersion": "0.3.0",
          "timestamp": "2023-08-09T22:06:34.070Z",
        }
      `);
    });

    it('encodes Server Reported Error without metadata', () => {
      function buildServerSideErrorEntry() {
        const error = new Error('something broke');
        Object.assign(error, {
          stack:
            'Error: something broke\n    at methodA (resource-a.js:1:1)\n    at methodB (resource-b.js:1:1)\n',
        });
        return { error };
      }
      logger.error(buildServerSideErrorEntry());
      expect(readLog()).toMatchInlineSnapshot(`
        {
          "application": {
            "name": "One App",
            "version": "1.2.3-abc123",
          },
          "device": {
            "agent": "mockType mockArch",
            "id": "mockHostname:1234",
          },
          "error": {
            "message": "something broke",
            "name": "Error",
            "stacktrace": "Error: something broke
            at methodA (resource-a.js:1:1)
            at methodB (resource-b.js:1:1)
        ",
          },
          "level": "error",
          "message": "something broke",
          "schemaVersion": "0.3.0",
          "timestamp": "2023-08-09T22:06:34.070Z",
        }
      `);
    });

    it('encodes Server Reported Error with nested metadata objects', () => {
      function buildServerSideErrorEntry() {
        const error = new Error('something broke');
        Object.assign(error, {
          stack:
            'Error: something broke\n    at methodA (resource-a.js:1:1)\n    at methodB (resource-b.js:1:1)\n',
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
        return { error };
      }
      logger.error(buildServerSideErrorEntry());
      expect(readLog()).toMatchInlineSnapshot(`
        {
          "application": {
            "name": "One App",
            "version": "1.2.3-abc123",
          },
          "device": {
            "agent": "mockType mockArch",
            "id": "mockHostname:1234",
          },
          "error": {
            "message": "something broke",
            "name": "Error",
            "stacktrace": "Error: something broke
            at methodA (resource-a.js:1:1)
            at methodB (resource-b.js:1:1)
        ",
          },
          "level": "error",
          "message": "something broke",
          "metaData": {
            "moduleID": "healthy-frank",
            "nestedObject": {
              "level1": {
                "level2": {
                  "level3": {
                    "level4": "logs nested objects correctly",
                  },
                },
              },
            },
          },
          "schemaVersion": "0.3.0",
          "timestamp": "2023-08-09T22:06:34.070Z",
        }
      `);
    });
  });
});
