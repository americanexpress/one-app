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

import {
  coloredLevels,
  printStatusCode,
  printStatusMessage,
  printDurationTime,
} from '../../../../src/server/utils/logging/utils';

jest.mock('chalk');

describe('utils', () => {
  describe('coloredLevels', () => {
    it('has a red error', () => expect(coloredLevels.error).toMatchSnapshot());
    it('has a yellow warn', () => expect(coloredLevels.warn).toMatchSnapshot());
    it('has a blue log', () => expect(coloredLevels.log).toMatchSnapshot());
    it('has a gray info', () => expect(coloredLevels.info).toMatchSnapshot());
  });

  describe('printStatusCode', () => {
    it('prints a 200 status code as green', () => {
      expect(printStatusCode({ request: { statusCode: 200 } })).toMatchSnapshot();
    });

    it('prints a 300 status code as blue', () => {
      expect(printStatusCode({ request: { statusCode: 300 } })).toMatchSnapshot();
    });

    it('prints a 400 status code as yellow', () => {
      expect(printStatusCode({ request: { statusCode: 400 } })).toMatchSnapshot();
    });

    it('prints a 500 status code as red', () => {
      expect(printStatusCode({ request: { statusCode: 500 } })).toMatchSnapshot();
    });

    it('prints a null status code as black text on red background', () => {
      expect(printStatusCode({ request: { statusCode: null } })).toMatchSnapshot();
    });
  });

  describe('printStatusMessage', () => {
    it('returns the status text when present', () => {
      expect(printStatusMessage({ request: { statusCode: null, statusText: 'OK' } })).toBe('OK');
    });

    it('returns status text based off the status code when present', () => {
      expect(printStatusMessage({ request: { statusCode: 200, statusText: null } })).toBe('OK');
    });

    it('returns a black on red background timed out message when the text and code do not map to text', () => {
      expect(
        printStatusMessage({ request: { statusCode: null, statusText: null } })
      ).toMatchSnapshot();
    });
  });

  describe('printDurationTime', () => {
    it('prints good times in green', () => {
      expect(printDurationTime({ request: { timings: { duration: 99 } } })).toMatchSnapshot();
    });

    it('prints acceptable times in yellow', () => {
      expect(printDurationTime({ request: { timings: { duration: 999 } } })).toMatchSnapshot();
    });

    it('prints long times in red', () => {
      expect(printDurationTime({ request: { timings: { duration: 5999 } } })).toMatchSnapshot();
    });

    it('prints unacceptable times in black on a red background', () => {
      expect(printDurationTime({ request: { timings: { duration: 6000 } } })).toMatchSnapshot();
    });
  });
});
