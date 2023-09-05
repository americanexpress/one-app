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

import util from 'util';
import CircuitBreaker from 'opossum';
import { getModule } from 'holocron';
import createCircuitBreaker, {
  setEventLoopDelayThreshold,
  getEventLoopDelayThreshold,
  setEventLoopDelayPercentile,
  getEventLoopDelayPercentile,
  getEventLoopDelayHistogram,
} from '../../../src/server/utils/createCircuitBreaker';

jest.useFakeTimers();

const asyncFunctionThatMightFail = jest.fn(async () => ({ fallback: false }));
const mockCircuitBreaker = createCircuitBreaker(asyncFunctionThatMightFail);

const eventLoopDelayHistogram = getEventLoopDelayHistogram();
const histogramPercentileSpy = jest.spyOn(eventLoopDelayHistogram, 'percentile');
const histogramResetSpy = jest.spyOn(eventLoopDelayHistogram, 'reset');

jest.mock('holocron', () => ({
  getModule: jest.fn(() => true),
}));

jest.mock('perf_hooks', () => ({
  ...jest.requireActual('perf_hooks'),
  monitorEventLoopDelay: jest.fn(() => ({
    enable: jest.fn(),
    reset: jest.fn(),
    percentile: jest.fn(() => 0),
  })),
}));

describe('Circuit breaker', () => {
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => 0);
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => 0);
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => 0);

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    setEventLoopDelayThreshold();
    setEventLoopDelayPercentile();
    mockCircuitBreaker.close();
    jest.clearAllMocks();
  });

  it('should be an opossum circuit breaker', () => {
    expect(mockCircuitBreaker).toBeInstanceOf(CircuitBreaker);
  });

  it('should reset the histogram every 30 seconds', () => {
    jest.advanceTimersByTime(30e3 + 10);
    expect(histogramResetSpy).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(30e3 + 10);
    expect(histogramResetSpy).toHaveBeenCalledTimes(2);
  });

  it('should call the given function', async () => {
    expect.assertions(2);
    const input = 'hello, world';
    const value = await mockCircuitBreaker.fire(input);
    expect(asyncFunctionThatMightFail).toHaveBeenCalledWith(input);
    expect(value).toEqual({ fallback: false });
  });

  it('should open the circuit when event loop delay threshold is exceeded', async () => {
    expect.assertions(2);
    setEventLoopDelayThreshold(-1);
    jest.advanceTimersByTime(5e3 + 10);
    // Need to fire the breaker once before it will open
    await mockCircuitBreaker.fire('hola, mundo');
    jest.clearAllMocks();
    const value = await mockCircuitBreaker.fire('hola, mundo');
    expect(asyncFunctionThatMightFail).not.toHaveBeenCalled();
    expect(value).toEqual({ fallback: true });
  });

  it('should not open the circuit when in development environment', async () => {
    process.env.NODE_ENV = 'development';
    expect.assertions(2);
    setEventLoopDelayThreshold(-1);
    jest.advanceTimersByTime(5e3 + 10);
    // Need to fire the breaker once before it will open
    await mockCircuitBreaker.fire('hola, mundo');
    jest.clearAllMocks();
    const value = await mockCircuitBreaker.fire('hola, mundo');
    expect(asyncFunctionThatMightFail).toHaveBeenCalled();
    expect(value).toEqual({ fallback: false });
  });

  it('should validate against the configured percentile', async () => {
    jest.advanceTimersByTime(5e3 + 10);
    expect(histogramPercentileSpy).toHaveBeenCalledWith(100);
    setEventLoopDelayPercentile(95);
    jest.advanceTimersByTime(5e3 + 10);
    expect(histogramPercentileSpy).toHaveBeenCalledWith(95);
  });

  it('should not open the circuit when threshold not exceeded', async () => {
    expect.assertions(2);
    setEventLoopDelayThreshold(250);
    jest.advanceTimersByTime(5e3 + 10);
    // Need to fire the breaker once before it will open
    await mockCircuitBreaker.fire('hola, mundo');
    jest.clearAllMocks();
    const value = await mockCircuitBreaker.fire('hola, mundo');
    expect(asyncFunctionThatMightFail).toHaveBeenCalled();
    expect(value).toEqual({ fallback: false });
  });

  it('should not open the circuit when the root module is not loaded', async () => {
    expect.assertions(2);
    getModule.mockReturnValueOnce(false);
    setEventLoopDelayThreshold(-1);
    jest.advanceTimersByTime(5e3 + 10);
    // Need to fire the breaker once before it will open
    await mockCircuitBreaker.fire('hola, mundo');
    jest.clearAllMocks();
    const value = await mockCircuitBreaker.fire('hola, mundo');
    expect(asyncFunctionThatMightFail).toHaveBeenCalled();
    expect(value).toEqual({ fallback: false });
  });

  it('should log when the healthcheck fails', async () => {
    expect.assertions(1);
    setEventLoopDelayThreshold(-1);
    jest.advanceTimersByTime(5e3 + 10);
    await mockCircuitBreaker.fire('hola, mundo');
    expect(consoleErrorSpy.mock.calls[0]).toMatchInlineSnapshot(`
      [
        [Error: Opening circuit, p(100) event loop delay (0ms) is > eventLoopDelayThreshold (-1ms)],
      ]
    `);
  });

  it('should log when the circuit opens', () => {
    mockCircuitBreaker.open();
    expect(util.format(...consoleLogSpy.mock.calls[0])).toMatchInlineSnapshot(
      '"Circuit breaker [mockConstructor] opened"'
    );
  });

  it('should log when the circuit closes', () => {
    mockCircuitBreaker.open();
    jest.clearAllMocks();
    mockCircuitBreaker.close();
    expect(util.format(...consoleLogSpy.mock.calls[0])).toMatchInlineSnapshot(
      '"Circuit breaker [mockConstructor] closed"'
    );
  });

  describe('event loop delay threshold', () => {
    it('should set a default value of 250ms', () => {
      setEventLoopDelayThreshold();
      expect(getEventLoopDelayThreshold()).toBe(250);
    });

    it('should set value to 250ms if input is not a number', () => {
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

  describe('event loop delay percentile', () => {
    it('should set a default value of 100', () => {
      setEventLoopDelayPercentile();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(getEventLoopDelayPercentile()).toBe(100);
    });

    it('should warn and set value to 100 if input is not a number', () => {
      setEventLoopDelayPercentile('hello, world');
      expect(util.format(...consoleWarnSpy.mock.calls[0])).toMatchInlineSnapshot(
        '"Event loop percentile must be an integer in range 1-100; given "hello, world". Defaulting to p(100)."'
      );
      expect(getEventLoopDelayPercentile()).toBe(100);
    });

    it('should warn and set value to 100 if input less than 1', () => {
      setEventLoopDelayPercentile(0);
      expect(util.format(...consoleWarnSpy.mock.calls[0])).toMatchInlineSnapshot(
        '"Event loop percentile must be an integer in range 1-100; given 0. Defaulting to p(100)."'
      );
      expect(getEventLoopDelayPercentile()).toBe(100);
    });

    it('should warn and set value to 100 if input less grater than 100', () => {
      setEventLoopDelayPercentile(101);
      expect(util.format(...consoleWarnSpy.mock.calls[0])).toMatchInlineSnapshot(
        '"Event loop percentile must be an integer in range 1-100; given 101. Defaulting to p(100)."'
      );
      expect(getEventLoopDelayPercentile()).toBe(100);
    });

    it('should warn and set value to 100 if input is a float', () => {
      setEventLoopDelayPercentile(99.9);
      expect(util.format(...consoleWarnSpy.mock.calls[0])).toMatchInlineSnapshot(
        '"Event loop percentile must be an integer in range 1-100; given 99.9. Defaulting to p(100)."'
      );
      expect(getEventLoopDelayPercentile()).toBe(100);
    });

    it('should set the given value', () => {
      setEventLoopDelayPercentile(44);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(getEventLoopDelayPercentile()).toBe(44);
    });
  });
});
