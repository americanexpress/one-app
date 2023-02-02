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

import { fromJS } from 'immutable';

import serverMiddleware, { setConfigureRequestLog } from '../../../../src/server/utils/logging/serverMiddleware';

import { startTimer, measureTime } from '../../../../src/server/utils/logging/timing';
import logger from '../../../../src/server/utils/logging/logger';

jest.mock('../../../../src/server/utils/logging/timing', () => ({
  startTimer: jest.fn(),
  measureTime: jest.fn(() => 12),
}));
jest.mock('../../../../src/server/utils/logging/logger', () => ({ info: jest.fn() }));

describe('serverMiddleware', () => {
  jest.spyOn(global, 'setImmediate').mockImplementation((cb) => cb());

  function createReqResNext() {
    const req = {
      method: 'GET',
      headers: {
        'correlation-id': '123',
        host: 'example.com',
        referer: 'https://example.com/other-place',
        'user-agent': 'Browser/8.0 (compatible; WXYZ 100.0; Doors LQ 81.4; Boat/1.0)',
      },
      cookies: {},
      protocol: 'https',
      hostname: 'example.com',
      originalUrl: '/resource',
      res: {
        statusCode: 200,
        statusMessage: 'OK',
      },
    };
    const res = {
      privateHeaderStore: {},
      getHeader: jest.fn((name) => res.privateHeaderStore[name]),
      writeHead: jest.fn(),
      on: jest.fn(),
    };
    const next = jest.fn();

    return { req, res, next };
  }

  function findMockCallForEvent(objectWithOnMethod, eventName) {
    return objectWithOnMethod.on.mock.calls.reduce((a, c) => {
      if (c[0] === eventName) {
        return c[1];
      }
      return a;
    }, null);
  }

  it('starts the request timer when the request comes in', () => {
    startTimer.mockClear();
    const { req, res, next } = createReqResNext();
    serverMiddleware(req, res, next);
    expect(startTimer).toHaveBeenCalledTimes(1);
    expect(startTimer).toHaveBeenCalledWith(req);
  });

  it('calls the next middleware', () => {
    const { req, res, next } = createReqResNext();
    setImmediate.mockClear();
    serverMiddleware(req, res, next);
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setImmediate).toHaveBeenCalledWith(next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('starts the response timer when headers are beginning to be written', () => {
    const { req, res, next } = createReqResNext();
    serverMiddleware(req, res, next);
    startTimer.mockClear();
    res.writeHead();
    expect(startTimer).toHaveBeenCalledTimes(1);
    expect(startTimer).toHaveBeenCalledWith(res);
  });

  it('logs the request & response when the response closes', () => {
    const { req, res, next } = createReqResNext();
    logger.info.mockClear();
    serverMiddleware(req, res, next);
    findMockCallForEvent(res, 'close')();
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info.mock.calls[0]).toMatchSnapshot();
  });

  describe('log entry', () => {
    it('uses the time to first byte', () => {
      const { req, res, next } = createReqResNext();
      logger.info.mockClear();
      measureTime
        .mockImplementationOnce(() => 56)
        .mockImplementationOnce(() => 34);
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.timings).toHaveProperty('ttfb', 22);
    });

    it('uses null for the time to first byte when not present', () => {
      const { req, res, next } = createReqResNext();
      logger.info.mockClear();
      measureTime
        .mockImplementationOnce(() => undefined)
        .mockImplementationOnce(() => undefined);
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.timings).toHaveProperty('ttfb', null);
    });

    it('uses the host header', () => {
      const { req, res, next } = createReqResNext();
      const expected = 'example.com';
      req.headers.host = expected;
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('host', expected);
    });

    it('uses null for the host header when not present', () => {
      const { req, res, next } = createReqResNext();
      delete req.headers.host;
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('host', null);
    });

    it('uses the referrer header', () => {
      const { req, res, next } = createReqResNext();
      const expected = 'https://example.com/referrer';
      req.headers.referrer = expected;
      delete req.headers.referer;
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('referrer', expected);
    });

    it('uses the referer header for referrer', () => {
      const { req, res, next } = createReqResNext();
      const expected = 'https://example.com/referer';
      delete req.headers.referrer;
      req.headers.referer = expected;
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('referrer', expected);
    });

    it('uses null for the referrer header when not present', () => {
      const { req, res, next } = createReqResNext();
      delete req.headers.referrer;
      delete req.headers.referer;
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('referrer', null);
    });

    it('uses the user agent header', () => {
      const { req, res, next } = createReqResNext();
      const expected = 'Browser/8.0 (compatible; WXYZ 100.0; Doors LQ 81.4; Boat/1.0)';
      req.headers['user-agent'] = expected;
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('userAgent', expected);
    });

    it('uses null for the user agent header when not present', () => {
      const { req, res, next } = createReqResNext();
      delete req.headers['user-agent'];
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('userAgent', null);
    });

    it('uses the location header', () => {
      const { req, res, next } = createReqResNext();
      const expected = 'https://example.com/another-place';
      res.privateHeaderStore.location = expected;
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('location', expected);
    });

    it('uses undefined for the location header when not present', () => {
      const { req, res, next } = createReqResNext();
      delete res.privateHeaderStore.location;
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('location', undefined);
    });

    it('uses the forwarded header', () => {
      const { req, res, next } = createReqResNext();
      const expected = 'by=example;for=example;host=example.com;proto=https';
      req.headers.forwarded = expected;
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('forwarded', expected);
    });

    it('uses null for the forwarded header when not present', () => {
      const { req, res, next } = createReqResNext();
      delete req.headers.forwarded;
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('forwarded', null);
    });

    it('uses the x-forwarded-for header', () => {
      const { req, res, next } = createReqResNext();
      const expected = '10.20.30.40';
      req.headers['x-forwarded-for'] = expected;
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('forwardedFor', expected);
    });

    it('uses undefined for the x-forwarded-for header when not present', () => {
      const { req, res, next } = createReqResNext();
      delete req.headers['x-forwarded-for'];
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('forwardedFor', null);
    });

    it('uses the activeLocale when the redux store is on the request', () => {
      const { req, res, next } = createReqResNext();
      const expected = 'tlh';
      req.store = { getState: () => fromJS({ intl: fromJS({ activeLocale: expected }) }) };
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('locale', expected);
    });

    it('uses undefined as the activeLocale when the redux store is not on the request', () => {
      const { req, res, next } = createReqResNext();
      delete req.store;
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      const entry = logger.info.mock.calls[0][0];
      expect(entry.request.metaData).toHaveProperty('locale', undefined);
    });
  });

  describe('setConfigureRequestLog', () => {
    const customConfigureRequestLog = jest.fn(() => ({ log }) => log);

    beforeEach(() => {
      customConfigureRequestLog.mockClear();
    });

    it('updates configureRequestLog function', () => {
      setConfigureRequestLog(customConfigureRequestLog);
      const { req, res, next } = createReqResNext();
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(customConfigureRequestLog.mock.calls[0][0].req).toEqual(req);
      expect(customConfigureRequestLog.mock.calls[0][0].res).toEqual(res);
      expect(customConfigureRequestLog.mock.calls[0][0].log).toMatchSnapshot();
    });

    it('sets to default passthrough when no arg given', () => {
      setConfigureRequestLog(customConfigureRequestLog);
      setConfigureRequestLog();
      const { req, res, next } = createReqResNext();
      logger.info.mockClear();
      serverMiddleware(req, res, next);
      findMockCallForEvent(res, 'close')();
      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(customConfigureRequestLog).not.toHaveBeenCalled();
    });
  });
});
