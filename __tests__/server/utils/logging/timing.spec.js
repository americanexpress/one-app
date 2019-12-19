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

import { startTimer, measureTime } from '../../../../src/server/utils/logging/timing';

describe('timing', () => {
  jest.spyOn(process, 'hrtime').mockImplementation((v) => (v ? [5 - v[0], 8e3 - v[1]] : [1, 1e3]));
  jest.spyOn(Date.prototype, 'toISOString').mockImplementation(() => '2018-02-16T01:15:41.972Z');

  describe('startTimer', () => {
    it('assigns _startAt', () => {
      const obj = {};
      expect(() => startTimer(obj)).not.toThrowError();
      expect(obj).toHaveProperty('_startAt', [1, 1000]);
    });

    it('assigns _startTime', () => {
      const obj = {};
      expect(() => startTimer(obj)).not.toThrowError();
      expect(obj).toHaveProperty('_startTime', '2018-02-16T01:15:41.972Z');
    });
  });

  describe('measureTime', () => {
    it('calculates the difference between now and _startAt', () => {
      const obj = { _startAt: [1, 1000] };
      expect(() => measureTime(obj)).not.toThrowError();
      expect(measureTime(obj)).toEqual(4000.007);
    });

    it('returns undefined if prev does not have a _startAt', () => {
      const obj = {};
      expect(() => measureTime(obj)).not.toThrowError();
      expect(measureTime(obj)).toEqual(undefined);
    });
  });
});
