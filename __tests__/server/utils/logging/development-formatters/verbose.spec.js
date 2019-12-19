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

import { beforeWrite, afterWrite, formatter } from '../../../../../src/server/utils/logging/development-formatters/verbose';

jest.mock('chalk');

describe('verbose', () => {
  describe('beforeWrite', () => {
    it('is undefined', () => {
      expect(beforeWrite).toBe(undefined);
    });
  });

  describe('afterWrite', () => {
    it('is undefined', () => {
      expect(afterWrite).toBe(undefined);
    });
  });

  describe('formatter', () => {
    it('prints the level with color', () => {
      expect(formatter('error', 'hello')).toMatchSnapshot();
    });

    it('drops lower levels', () => {
      expect(formatter('debug', 1, 2, 3)).toBe(null);
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
      expect(formatter('error', entry)).toMatchSnapshot();
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
      expect(formatter('error', entry)).toMatchSnapshot();
    });

    describe('unknown type', () => {
      it('is formatted by util.format', () => {
        expect(formatter('error', 'hello, %s', 'world')).toMatchSnapshot();
      });
    });
  });
});
