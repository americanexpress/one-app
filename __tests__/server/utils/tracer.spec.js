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

import {
  NoOpTracer,
  Tracer,
  initializeTracer,
  completeTracer,
  traceMiddleware,
  enhanceFetchWithTracer,
} from '../../../src/server/utils/tracer';

jest.spyOn(console, 'log');
jest.spyOn(console, 'warn');
jest.useFakeTimers().setSystemTime(new Date('1993-07-25'));
jest.spyOn(process.hrtime, 'bigint');

describe('the tracer module', () => {
  // Note hrTime is in nanoseconds,
  // if you want to progress the time by milliseconds, you need to add at-least 1000000
  let mockHrTime = 0n;
  const setMockHrTime = (nextHrTime) => {
    mockHrTime = BigInt(nextHrTime);
  };
  const addMockHrTimeMs = (additionalHrTime) => {
    mockHrTime += BigInt(additionalHrTime * 1000000);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    setMockHrTime(1111122222333); // the actual time is unimportant
    process.hrtime.bigint.mockImplementation(() => mockHrTime);
  });

  describe('Tracer Class', () => {
    it("should By default, create an trace with only a 't', 'd' and 'u' field", () => {
      const tracer = new Tracer();
      addMockHrTimeMs(12);
      tracer.completeTraceAndLog();
      expect(console.log.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Trace: {\\"u\\":\\"-\\",\\"t\\":743558400000,\\"d\\":12} ",
        ]
      `);
    });

    it("should use the passed value as the 'u' field", () => {
      const tracer = new Tracer('https://mock.com/mock/url');
      addMockHrTimeMs(12);
      tracer.completeTraceAndLog();
      expect(console.log.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Trace: {\\"u\\":\\"https://mock.com/mock/url\\",\\"t\\":743558400000,\\"d\\":12} ",
        ]
      `);
    });

    it('should contain server phases if there were server phases started and stopped', () => {
      const tracer = new Tracer();
      addMockHrTimeMs(12);

      tracer.startServerPhaseTimer('1');
      addMockHrTimeMs(10);
      tracer.endServerPhaseTimer('1');

      tracer.startServerPhaseTimer('2');
      addMockHrTimeMs(100);
      tracer.endServerPhaseTimer('2');

      tracer.startServerPhaseTimer('3');
      addMockHrTimeMs(30);
      tracer.endServerPhaseTimer('3');
      tracer.completeTraceAndLog();
      expect(console.log.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Trace: {\\"1\\":{\\"s\\":12,\\"d\\":10},\\"2\\":{\\"s\\":22,\\"d\\":100},\\"3\\":{\\"s\\":122,\\"d\\":30},\\"u\\":\\"-\\",\\"t\\":743558400000,\\"d\\":152} ",
        ]
      `);
    });

    it('should contain fetch traces if there were fetch traces started and stopped', () => {
      const tracer = new Tracer();
      addMockHrTimeMs(12);

      tracer.startFetchTimer('1.url.com.example');
      tracer.startFetchTimer('2.url.com.example');
      addMockHrTimeMs(10);
      tracer.endFetchTimer('1.url.com.example');

      addMockHrTimeMs(100);

      tracer.startFetchTimer('3.url.com.example');
      addMockHrTimeMs(30);
      tracer.endFetchTimer('3.url.com.example');
      tracer.endFetchTimer('2.url.com.example');
      tracer.completeTraceAndLog();
      expect(console.log.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Trace: {\\"u\\":\\"-\\",\\"t\\":743558400000,\\"d\\":152,\\"f\\":{\\"1.url.com.example\\":{\\"s\\":12,\\"d\\":10},\\"2.url.com.example\\":{\\"s\\":12,\\"d\\":140},\\"3.url.com.example\\":{\\"s\\":122,\\"d\\":30}}} ",
        ]
      `);
    });

    it('should contain fetch traces even if they were never stopped', () => {
      const tracer = new Tracer();
      addMockHrTimeMs(12);

      tracer.startFetchTimer('1.url.com.example');
      tracer.startFetchTimer('2.url.com.example');
      addMockHrTimeMs(10);

      addMockHrTimeMs(100);

      tracer.startFetchTimer('3.url.com.example');
      addMockHrTimeMs(30);
      tracer.completeTraceAndLog();
      expect(console.log.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Trace: {\\"u\\":\\"-\\",\\"t\\":743558400000,\\"d\\":152,\\"f\\":{\\"1.url.com.example\\":{\\"s\\":12},\\"2.url.com.example\\":{\\"s\\":12},\\"3.url.com.example\\":{\\"s\\":122}}} ",
        ]
      `);
    });

    it('should contain fetch traces that ended with an error', () => {
      const tracer = new Tracer();
      addMockHrTimeMs(12);

      tracer.startFetchTimer('1.url.com.example');
      tracer.startFetchTimer('2.url.com.example');
      addMockHrTimeMs(10);
      tracer.endFetchTimerWithError('1.url.com.example', {
        message: 'Error calling 1.url.com.example',
        stack: 'mock Stack',
      });

      addMockHrTimeMs(100);

      tracer.startFetchTimer('3.url.com.example');
      addMockHrTimeMs(30);
      tracer.endFetchTimerWithError('3.url.com.example', {
        message: 'Error calling 3.url.com.example',
        stack: 'mock Stack',
      });
      tracer.endFetchTimerWithError('2.url.com.example', {
        message: 'Error calling 2.url.com.example',
        stack: 'mock Stack',
      });
      tracer.completeTraceAndLog();
      expect(console.log.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Trace: {\\"u\\":\\"-\\",\\"t\\":743558400000,\\"d\\":152,\\"f\\":{\\"1.url.com.example\\":{\\"s\\":12,\\"d\\":10,\\"em\\":\\"Error calling 1.url.com.example\\",\\"es\\":\\"mock Stack\\"},\\"2.url.com.example\\":{\\"s\\":12,\\"d\\":140,\\"em\\":\\"Error calling 2.url.com.example\\",\\"es\\":\\"mock Stack\\"},\\"3.url.com.example\\":{\\"s\\":122,\\"d\\":30,\\"em\\":\\"Error calling 3.url.com.example\\",\\"es\\":\\"mock Stack\\"}}} ",
        ]
      `);
    });

    it('should log a warning if tracer was stopped without being started', () => {
      const tracer = new Tracer();
      addMockHrTimeMs(12);

      tracer.endFetchTimer('1.url.com.example');
      expect(console.warn.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Tracer Error: endFetchTimer was called without startFetchTimer",
        ]
      `);
      tracer.endFetchTimerWithError('1.url.com.example');
      expect(console.warn.mock.calls[1]).toMatchInlineSnapshot(`
        Array [
          "Tracer Error: endFetchTimer was called without startFetchTimer",
        ]
      `);
      expect(console.warn.mock.calls[2]).toMatchInlineSnapshot(`
        Array [
          "Tracer Error: endFetchTimerWithError was called without startFetchTimer",
        ]
      `);
      tracer.endServerPhaseTimer('1');
      expect(console.warn.mock.calls[3]).toMatchInlineSnapshot(`
        Array [
          "Tracer Error: endServerPhaseTimer was called without startServerPhaseTimer",
        ]
      `);
    });

    it('should provide an auto incrementing fetch counter, to assist in the global enumeration of fetches', () => {
      const tracer = new Tracer();
      expect(tracer.getAndIncrementFetchCount()).toBe(0);
      expect(tracer.getAndIncrementFetchCount()).toBe(1);
      expect(tracer.getAndIncrementFetchCount()).toBe(2);
      expect(tracer.getAndIncrementFetchCount()).toBe(3);
      expect(tracer.getAndIncrementFetchCount()).toBe(4);
    });
  });

  describe('NoOpTracer Class', () => {
    it('should not throw for any public function call', () => {
      const noOpTracer = new NoOpTracer();
      Object.values(noOpTracer).forEach((func) => {
        expect(func).not.toThrow();
      });
    });

    it('should contain exactly the same public functions as the main tracer', () => {
      const tracer = new Tracer();
      const noOpTracer = new NoOpTracer();
      expect(Object.keys(noOpTracer)).toEqual(Object.keys(tracer));
    });
  });

  describe('initializeTracer express middleware', () => {
    let prevNodeEnv = null;
    let prevOneEnableServerTracing = null;
    const res = Symbol('untouched response object');
    let req;
    const next = () => {};
    beforeEach(() => {
      prevNodeEnv = process.env.NODE_ENV;
      prevOneEnableServerTracing = process.env.ONE_ENABLE_SERVER_TRACING;
      req = {
        protocol: 'mockProtocol',
        get: (field) => {
          if (field !== 'Host') {
            throw new Error('These tests should only end up calling get("Host");');
          }
          return 'mockHost';
        },
        url: '/mock/Url/',
      };
    });
    afterEach(() => {
      process.env.NODE_ENV = prevNodeEnv;
      process.env.ONE_ENABLE_SERVER_TRACING = prevOneEnableServerTracing;
    });
    it('should install the Tracer if ONE_ENABLE_SERVER_TRACING is true in prod', () => {
      process.env.NODE_ENV = 'production';
      process.env.ONE_ENABLE_SERVER_TRACING = 'true';

      initializeTracer(req, res, next);
      expect(req.tracer instanceof Tracer).toBeTruthy();
    });
    it('should install the Tracer if ONE_ENABLE_SERVER_TRACING is false in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.ONE_ENABLE_SERVER_TRACING = 'false';

      initializeTracer(req, res, next);
      expect(req.tracer instanceof Tracer).toBeTruthy();
    });
    it('should install the NoOpTracer if ONE_ENABLE_SERVER_TRACING is false in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.ONE_ENABLE_SERVER_TRACING = 'false';

      initializeTracer(req, res, next);
      expect(req.tracer instanceof NoOpTracer).toBeTruthy();
    });
    it('should call next to keep the middleware chain going', () => {
      const mockedNext = jest.fn();

      initializeTracer(req, res, mockedNext);
      expect(mockedNext).toHaveBeenCalled();
    });
  });

  describe('completeTracer express middleware', () => {
    const res = Symbol('untouched response object');
    const next = () => {};
    it('should call "completeTraceAndLog" on the tracer in the req', () => {
      const tracer = new Tracer();
      jest.spyOn(tracer, 'completeTraceAndLog');

      const req = { tracer };

      completeTracer(req, res, next);
      expect(tracer.completeTraceAndLog).toHaveBeenCalled();
    });
    it('should call next to keep the middleware chain going', () => {
      const mockedNext = jest.fn();

      completeTracer({ tracer: new Tracer() }, res, mockedNext);
      expect(mockedNext).toHaveBeenCalled();
    });
  });

  describe('traceMiddleware express higher order middleware', () => {
    const res = Symbol('untouched response object');
    const next = () => {};
    const serverKeySymbol = Symbol('serverKeySymbol');
    let nextFuncPassedToMiddleware = null;
    const middleware = jest.fn((_res, _req, _next) => {
      addMockHrTimeMs(59374);
      nextFuncPassedToMiddleware = _next;
      _next();
    });

    beforeEach(() => {
      jest.clearAllMocks();
      nextFuncPassedToMiddleware = null;
    });
    it('should start a timer, then call the passed middleware, then stop a timer on the tracer in the req', async () => {
      const tracer = new Tracer();
      let startHrTime;
      let endHrTime;

      jest.spyOn(tracer, 'startServerPhaseTimer');
      tracer.startServerPhaseTimer.mockImplementation(() => {
        startHrTime = process.hrtime.bigint();
      });
      jest.spyOn(tracer, 'endServerPhaseTimer');
      tracer.endServerPhaseTimer.mockImplementation(() => {
        endHrTime = process.hrtime.bigint();
      });

      const req = { tracer };

      const tracedMiddleware = traceMiddleware(middleware, serverKeySymbol);
      await tracedMiddleware(req, res, next);

      // This is an odd sort of test.
      // But here the 'middleware' we are tracing is one that does nothing but
      // add some time to the timer
      // Therefore, if the time added is present in endHrTime but not startHrTime,
      // then that middleware must have run between the calls to
      // startServerPhaseTimer and endServerPhaseTimer
      expect(endHrTime - 59374000000n).toBe(startHrTime);

      // Then just make sure all the functions were passed what they need
      expect(tracer.startServerPhaseTimer).toHaveBeenCalledTimes(1);
      expect(tracer.startServerPhaseTimer).toHaveBeenCalledWith(serverKeySymbol);

      expect(tracer.endServerPhaseTimer).toHaveBeenCalledTimes(1);
      expect(tracer.endServerPhaseTimer).toHaveBeenCalledWith(serverKeySymbol);

      expect(middleware).toHaveBeenCalledTimes(1);
      expect(middleware).toHaveBeenCalledWith(req, res, nextFuncPassedToMiddleware);
    });
    it('should call next to keep the middleware chain going', async () => {
      const mockedNext = jest.fn();

      const tracedMiddleware = traceMiddleware(middleware, serverKeySymbol);
      await tracedMiddleware({ tracer: new Tracer() }, res, mockedNext);
      expect(mockedNext).toHaveBeenCalled();
    });
  });

  describe('enhanceFetchWithTracer fetch higher middleware', () => {
    const paramsSymbol = Symbol('fetch param symbol');
    const fetchParams = ['1.url.com.example', paramsSymbol];
    let fetchPromiseFunctor = null;
    const fetch = jest.fn(() => new Promise(fetchPromiseFunctor));

    let tracer;
    let req;
    let startHrTime;
    let endHrTime;

    beforeEach(() => {
      jest.clearAllMocks();
      fetchPromiseFunctor = null;

      tracer = new Tracer();

      jest.spyOn(tracer, 'startFetchTimer');
      tracer.startFetchTimer.mockImplementation(() => {
        startHrTime = process.hrtime.bigint();
      });
      jest.spyOn(tracer, 'endFetchTimer');
      tracer.endFetchTimer.mockImplementation(() => {
        endHrTime = process.hrtime.bigint();
      });
      jest.spyOn(tracer, 'endFetchTimerWithError');
      tracer.endFetchTimerWithError.mockImplementation(() => {
        endHrTime = process.hrtime.bigint();
      });

      req = { tracer };
    });
    it('should start a fetch timer, then await the fetch, then stop a fetch timer on the tracer in the req', async () => {
      const resolutionSymbol = Symbol('the value returned from fetch');

      fetchPromiseFunctor = (resolve) => {
        addMockHrTimeMs(56773);
        resolve(resolutionSymbol);
      };

      const tracedFetch = enhanceFetchWithTracer(req, fetch);
      const fetchedResponse = await tracedFetch(...fetchParams);

      // the tracedFetch returns what the passed fetch did untouched
      expect(fetchedResponse).toBe(resolutionSymbol);

      // This is an odd sort of test.
      // But here the 'fetch' we are tracing is one that does nothing but
      // add some time to the timer
      // Therefore, if the time added is present in endHrTime but not startHrTime,
      // then that fetch must have run between the calls to
      // startServerPhaseTimer and endServerPhaseTimer
      expect(endHrTime - 56773000000n).toBe(startHrTime);

      // Then just make sure all the functions were passed what they need
      expect(tracer.startFetchTimer).toHaveBeenCalledTimes(1);
      expect(tracer.startFetchTimer).toHaveBeenCalledWith(`0 ${fetchParams[0]}`);

      expect(tracer.endFetchTimer).toHaveBeenCalledTimes(1);
      expect(tracer.endFetchTimer).toHaveBeenCalledWith(`0 ${fetchParams[0]}`);

      expect(tracer.endFetchTimerWithError).toHaveBeenCalledTimes(0);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(...fetchParams);
    });

    it('should start a fetch timer, then await the fetch, then stop the timer with an error if the fetch threw', async () => {
      const error = new Error('the error thrown from fetch');

      fetchPromiseFunctor = (resolve, reject) => {
        addMockHrTimeMs(56773);
        reject(error);
      };

      const tracedFetch = enhanceFetchWithTracer(req, fetch);
      // await tracedFetch(...fetchParams)
      await expect(() => tracedFetch(...fetchParams)).rejects.toThrow(error);

      // This is an odd sort of test.
      // But here the 'fetch' we are tracing is one that does nothing but
      // add some time to the timer
      // Therefore, if the time added is present in endHrTime but not startHrTime,
      // then that fetch must have run between the calls to
      // startServerPhaseTimer and endServerPhaseTimer
      expect(endHrTime - 56773000000n).toBe(startHrTime);

      // Then just make sure all the functions were passed what they need
      expect(tracer.startFetchTimer).toHaveBeenCalledTimes(1);
      expect(tracer.startFetchTimer).toHaveBeenCalledWith(`0 ${fetchParams[0]}`);

      expect(tracer.endFetchTimer).toHaveBeenCalledTimes(0);

      expect(tracer.endFetchTimerWithError).toHaveBeenCalledTimes(1);
      expect(tracer.endFetchTimerWithError).toHaveBeenCalledWith(`0 ${fetchParams[0]}`, error);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(...fetchParams);
    });
    it('should produce unique keys, by enumeration, for each call even if the url is the same', async () => {
      fetchPromiseFunctor = (resolve) => {
        resolve(true);
      };

      const tracedFetch = enhanceFetchWithTracer(req, fetch);
      await tracedFetch(...fetchParams);
      await tracedFetch(...fetchParams);

      const secondApiFetchParams = ['2.url.com.example', paramsSymbol];

      await tracedFetch(...secondApiFetchParams);
      await tracedFetch(...secondApiFetchParams);

      expect(tracer.startFetchTimer).toHaveBeenCalledTimes(4);
      expect(tracer.startFetchTimer).toHaveBeenNthCalledWith(1, `0 ${fetchParams[0]}`);
      expect(tracer.startFetchTimer).toHaveBeenNthCalledWith(2, `1 ${fetchParams[0]}`);
      expect(tracer.startFetchTimer).toHaveBeenNthCalledWith(3, `2 ${secondApiFetchParams[0]}`);
      expect(tracer.startFetchTimer).toHaveBeenNthCalledWith(4, `3 ${secondApiFetchParams[0]}`);

      expect(tracer.endFetchTimer).toHaveBeenCalledTimes(4);
      expect(tracer.endFetchTimer).toHaveBeenNthCalledWith(1, `0 ${fetchParams[0]}`);
      expect(tracer.endFetchTimer).toHaveBeenNthCalledWith(2, `1 ${fetchParams[0]}`);
      expect(tracer.endFetchTimer).toHaveBeenNthCalledWith(3, `2 ${secondApiFetchParams[0]}`);
      expect(tracer.endFetchTimer).toHaveBeenNthCalledWith(4, `3 ${secondApiFetchParams[0]}`);

      expect(tracer.endFetchTimerWithError).toHaveBeenCalledTimes(0);

      expect(fetch).toHaveBeenCalledTimes(4);
      expect(fetch).toHaveBeenNthCalledWith(1, ...fetchParams);
      expect(fetch).toHaveBeenNthCalledWith(2, ...fetchParams);
      expect(fetch).toHaveBeenNthCalledWith(3, ...secondApiFetchParams);
      expect(fetch).toHaveBeenNthCalledWith(4, ...secondApiFetchParams);
    });
  });
});
