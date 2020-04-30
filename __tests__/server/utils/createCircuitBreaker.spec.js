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
import { getModule } from 'holocron';
import createCircuitBreaker, {
  setEventLoopDelayThreshold,
  getEventLoopDelayThreshold,
} from '../../../src/server/utils/createCircuitBreaker';

jest.useFakeTimers();

const asyncFuntionThatMightFail = jest.fn(async () => false);
const mockCircuitBreaker = createCircuitBreaker(asyncFuntionThatMightFail);

jest.mock('holocron', () => ({
  getModule: jest.fn(() => true),
}));

describe('Circuit breaker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setEventLoopDelayThreshold();
    mockCircuitBreaker.close();
  });

  it('should be an opossum circuit breaker', () => {
    expect(mockCircuitBreaker).toBeInstanceOf(CircuitBreaker);
  });

  it('should call the given function', async () => {
    expect.assertions(2);
    const input = 'hello, world';
    const value = await mockCircuitBreaker.fire(input);
    expect(asyncFuntionThatMightFail).toHaveBeenCalledWith(input);
    expect(value).toBe(false);
  });

  it('should open the circuit when event loop delay threshold is exceeded', async () => {
    expect.assertions(2);
    setEventLoopDelayThreshold(-1);
    jest.advanceTimersByTime(510);
    // Need to fire the breaker once before it will open
    await mockCircuitBreaker.fire('hola, mundo');
    jest.clearAllMocks();
    const value = await mockCircuitBreaker.fire('hola, mundo');
    expect(asyncFuntionThatMightFail).not.toHaveBeenCalled();
    expect(value).toBe(true);
  });

  it('should not open the circuit when the root module is not loaded', async () => {
    expect.assertions(2);
    getModule.mockReturnValueOnce(false);
    setEventLoopDelayThreshold(-1);
    jest.advanceTimersByTime(510);
    // Need to fire the breaker once before it will open
    await mockCircuitBreaker.fire('hola, mundo');
    jest.clearAllMocks();
    const value = await mockCircuitBreaker.fire('hola, mundo');
    expect(asyncFuntionThatMightFail).toHaveBeenCalled();
    expect(value).toBe(false);
  });

  describe('event loop delay threshold', () => {
    it('should set a default value of 30ms', () => {
      setEventLoopDelayThreshold();
      expect(getEventLoopDelayThreshold()).toBe(250);
    });

    it('should set value to 30ms if input is not a number', () => {
      setEventLoopDelayThreshold('hello, world');
      expect(getEventLoopDelayThreshold()).toBe(250);
    });

    it('should set the given value', () => {
      setEventLoopDelayThreshold(44);
      expect(getEventLoopDelayThreshold()).toBe(44);
    });

    it('should handle numbers as strings', () => {
      setEventLoopDelayThreshold('55');
      expect(getEventLoopDelayThreshold()).toBe(55);
    });
  });
});
