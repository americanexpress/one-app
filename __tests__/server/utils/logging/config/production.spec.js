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

jest.mock('os', () => ({
  hostname: () => 'mockHostname',
  type: () => 'mockType',
  arch: () => 'mockArch',
}));

jest.mock('../../../../../src/server/utils/readJsonFile', () => () => ({
  buildVersion: '1.2.3-abc123',
}));

jest.spyOn(Date, 'now').mockReturnValue(1691618794070);

Object.defineProperty(process, 'pid', {
  writable: true,
  value: 1234,
});

describe('production logger config', () => {
  let productionConfig;

  beforeAll(() => {
    Object.defineProperty(process, 'pid', {
      writable: true,
      value: 1234,
    });
    productionConfig = require('../../../../../src/server/utils/logging/config/production').default;
  });

  it('should return timestamp in the ISO 8601 format with the key "timestamp"', () => {
    expect(productionConfig.timestamp()).toMatchInlineSnapshot(
      '","timestamp":"2023-08-09T22:06:34.070Z""'
    );
  });

  it('should configure the error and message keys', () => {
    expect(productionConfig.errorKey).toBe('error');
    expect(productionConfig.messageKey).toBe('message');
  });

  it('should add the schema, application data and device data to each log', () => {
    expect(productionConfig.base).toMatchInlineSnapshot(`
      {
        "application": {
          "name": "One App",
          "version": "1.2.3-abc123",
        },
        "device": {
          "agent": "mockType mockArch",
          "id": "mockHostname:1234",
        },
        "schemaVersion": "0.3.0",
      }
    `);
  });

  it('should serialize an error with a name, message & stacktrace', () => {
    let error;
    try {
      error = new Error('mock error');
    } catch (e) {
      // do nothing
    }
    error.stack = 'mock stack';
    expect(productionConfig.serializers.err(error)).toMatchInlineSnapshot(`
      {
        "message": "mock error",
        "name": "Error",
        "stacktrace": "mock stack",
      }
    `);
  });

  it('should serialize an error with a missing message & stacktrace', () => {
    let error;
    try {
      error = new Error();
    } catch (e) {
      // do nothing
    }
    delete error.stack;
    expect(productionConfig.serializers.err(error)).toMatchInlineSnapshot(`
      {
        "message": "<none>",
        "name": "Error",
        "stacktrace": "<none>",
      }
    `);
  });

  it('should map the log level to the schema level', () => {
    expect(productionConfig.formatters.level('error')).toEqual({ level: 'error' });
    expect(productionConfig.formatters.level('warn')).toEqual({ level: 'warning' });
    expect(productionConfig.formatters.level('log')).toEqual({ level: 'notice' });
    expect(productionConfig.formatters.level('info')).toEqual({ level: 'info' });
    expect(productionConfig.formatters.level('debug')).toEqual({ level: 'debug' });
  });

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

    const entry = productionConfig.formatters.log(buildClientErrorEntry());
    expect(entry).toMatchInlineSnapshot(`
      {
        "device": {
          "agent": "Browser/5.0 (compatible; WXYZ 100.0; Doors LQ 81.4; Boat/1.0)",
        },
        "error": [ClientReportedError: something broke],
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

    const entry = productionConfig.formatters.log(buildServerSideErrorEntry());
    expect(entry).toMatchInlineSnapshot(`
      {
        "error": [Error: something broke],
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

    const entry = productionConfig.formatters.log(buildServerSideErrorEntry());
    expect(entry).toMatchInlineSnapshot(`
      {
        "error": [Error: something broke],
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
      }
    `);
  });

  it('does not modify non-error logs', () => {
    const mockLog = { message: 'mock message' };
    expect(productionConfig.formatters.log(mockLog)).toBe(mockLog);
  });
});
