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

import pinoPretty from 'pino-pretty';
import '../../../../../src/server/utils/logging/config/development';

jest.mock('pino-pretty');

describe('development logger stream', () => {
  it('should ignore pid, hostname & time', () => {
    expect(pinoPretty.mock.calls[0][0].ignore).toBe('pid,hostname,time');
  });

  it('should set custom levels', () => {
    expect(pinoPretty.mock.calls[0][0].customLevels).toMatchInlineSnapshot(`
      {
        "debug": 20,
        "error": 50,
        "fatal": 60,
        "info": 30,
        "log": 35,
        "trace": 10,
        "warn": 40,
      }
    `);
  });

  it('should set custom colors', () => {
    expect(pinoPretty.mock.calls[0][0].customColors).toBe(
      'trace:white,debug:green,info:gray,log:blue,warn:yellow,error:red,fatal:bgRed'
    );
  });

  it('pretty-prints an incoming request', () => {
    const entry = {
      type: 'request',
      request: {
        direction: 'in',
        protocol: 'https',
        address: {
          uri: 'https://example.com/resource',
        },
        metaData: {
          method: 'GET',
          correlationId: '123',
          // null to explicitly signal no value, undefined if not expected for every request
          host: 'example.com',
          referrer: 'https://example.com/other-resource',
          userAgent: 'Browser/8.0 (compatible; WXYZ 100.0; Doors LQ 81.4; Boat/1.0)',
          location: undefined,
        },
        timings: {
          duration: 13,
          ttfb: 12,
        },
        statusCode: 200,
        statusText: 'OK',
      },
    };
    expect(pinoPretty.mock.calls[0][0].messageFormat(entry, 'msg')).toMatchInlineSnapshot(
      '"🌍 ➡ 💻 <green>200</green> OK GET https://example.com/resource 12/13ms"'
    );
  });

  it('pretty-prints an outgoing request', () => {
    const entry = {
      type: 'request',
      request: {
        direction: 'out',
        protocol: 'https',
        address: {
          uri: 'https://example.com/resource',
        },
        metaData: {
          method: 'GET',
          // null to explicitly signal no value, undefined if not expected for every request
          correlationId: '123',
        },
        timings: {
          duration: 13,
        },
        statusCode: 200,
        statusText: 'OK',
      },
    };
    expect(pinoPretty.mock.calls[0][0].messageFormat(entry, 'msg')).toMatchInlineSnapshot(
      '"💻 ➡ 🗄️ <green>200</green> OK GET https://example.com/resource <green>13</green>ms"'
    );
  });

  it('does not modify non-request logs', () => {
    const msg = 'mock log';
    expect(pinoPretty.mock.calls[0][0].messageFormat({ msg }, 'msg')).toBe(msg);
  });
});
