/*
 * Copyright 2020 American Express Travel Related Services Company, Inc.
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

import CircuitBreaker from 'opossum';
import breaker, {
  setEventLoopLagThreshold,
  getEventLoopLagThreshold,
} from '../../../src/server/utils/circuitBreaker';

describe('Circuit breaker', () => {
  it('should be an opossum circuit breaker', () => {
    expect(breaker).toBeInstanceOf(CircuitBreaker);
  });

  // Tests for circuit breaker functionality can be found in
  // __tests__/server/middleware/createRequestHtmlFragment.spec.js

  describe('setEventLoopLagThreshold', () => {
    it('should set a default value of 30ms', () => {
      setEventLoopLagThreshold();
      expect(getEventLoopLagThreshold()).toBe(30);
    });

    it('should set value to 30ms if input is not a number', () => {
      setEventLoopLagThreshold('hello, world');
      expect(getEventLoopLagThreshold()).toBe(30);
    });

    it('should set the given value', () => {
      setEventLoopLagThreshold(44);
      expect(getEventLoopLagThreshold()).toBe(44);
    });

    it('should handle numbers as strings', () => {
      setEventLoopLagThreshold('55');
      expect(getEventLoopLagThreshold()).toBe(55);
    });
  });
});
