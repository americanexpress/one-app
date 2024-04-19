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

import { PassThrough } from 'node:stream';
import pinoPretty from 'pino-pretty';
import pino from 'pino';
import { pinoPrettyOptions } from '../../../../../src/server/utils/logging/config/development';
import baseConfig from '../../../../../src/server/utils/logging/config/base';

jest.mock('yargs', () => ({
  argv: {
    logLevel: 'trace',
  },
}));

let streamData = '';
const mockStream = new PassThrough();
mockStream.on('data', (d) => {
  streamData += d;
});
const resetStreamData = () => {
  streamData = '';
};

const pinoPrettyStream = pinoPretty({
  ...pinoPrettyOptions,
  destination: mockStream,
});
const logger = pino(baseConfig, pinoPrettyStream);

describe('development logger', () => {
  beforeEach(() => resetStreamData());
  afterAll(() => mockStream.destroy());

  it('should not include pid, hostname or time', () => {
    logger.log('this is a test');
    expect(streamData.trim()).toMatchInlineSnapshot(
      '"<blue>LOG</blue>: <cyan>this is a test</cyan>"'
    );
  });

  it('should set different colors for each level', () => {
    logger.trace();
    logger.debug();
    logger.info();
    logger.log();
    logger.warn();
    logger.error();
    logger.fatal();
    expect(streamData.trim()).toMatchInlineSnapshot(`
      "<white>TRACE</white>: <cyan></cyan>
      <green>DEBUG</green>: <cyan></cyan>
      <gray>INFO</gray>: <cyan></cyan>
      <blue>LOG</blue>: <cyan></cyan>
      <yellow>WARN</yellow>: <cyan></cyan>
      <red>ERROR</red>: <cyan></cyan>
      <bgRed>FATAL</bgRed>: <cyan></cyan>"
    `);
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
    logger.info(entry);
    expect(streamData.trim()).toMatchInlineSnapshot(
      '"<gray>INFO</gray>: <cyan>🌍 ➡ 💻 <green>200</green> OK GET https://example.com/resource 12/13ms</cyan>"'
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
          correlationId: '123',
        },
        timings: {
          duration: 13,
        },
        statusCode: 200,
        statusText: 'OK',
      },
    };
    logger.info(entry);
    expect(streamData.trim()).toMatchInlineSnapshot(
      '"<gray>INFO</gray>: <cyan>💻 ➡ 🗄️ <green>200</green> OK GET https://example.com/resource <green>13</green>ms</cyan>"'
    );
  });

  describe('logMethod hook', () => {
    const mockError = new Error('mockError');
    delete mockError.stack;

    it('should take an error from the end of a log call and put it in the error key', () => {
      logger.error('This is a %s', 'test', mockError);
      expect(streamData.trim()).toMatchInlineSnapshot(`
        "<red>ERROR</red>: <cyan>This is a test</cyan>
            error: {
              "type": "Error",
              "message": "mockError",
              "stack":
                  
            }"
      `);
    });

    it('should take an error from the beginning of a log call and put it in the error key', () => {
      logger.warn(mockError, 'This is another %s', 'test');
      expect(streamData.trim()).toMatchInlineSnapshot(`
        "<yellow>WARN</yellow>: <cyan>This is another test</cyan>
            error: {
              "type": "Error",
              "message": "mockError",
              "stack":
                  
            }"
      `);
    });

    it('should not change log calls that do not begin or end with errors', () => {
      logger.info('This is a third %s', 'test');
      expect(streamData.trim()).toMatchInlineSnapshot(
        '"<gray>INFO</gray>: <cyan>This is a third test</cyan>"'
      );
    });
  });
});
