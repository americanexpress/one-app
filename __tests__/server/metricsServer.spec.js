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

import request from 'supertest';

describe('metricsServer', () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});

  let client;
  let promGcStats;
  let healthCheck;
  let logging;

  function load({ gcStatsError = false } = {}) {
    jest.resetModules();

    jest.mock('prom-client');
    if (gcStatsError) {
      jest.mock('gc-stats', () => {
        throw new Error('unable to resolve gc-stats');
      }, { virtual: true });
    } else {
      jest.mock('gc-stats', () => jest.fn(), { virtual: true });
    }
    jest.mock('prometheus-gc-stats', () => jest.fn(() => () => {}));
    jest.mock('../../src/server/utils/logging/serverMiddleware', () => jest.fn((req, res, next) => next()));
    jest.mock('../../src/server/middleware/healthCheck');

    client = require('prom-client');
    promGcStats = require('prometheus-gc-stats');
    logging = require('../../src/server/utils/logging/serverMiddleware');
    healthCheck = require('../../src/server/middleware/healthCheck').default;

    return require('../../src/server/metricsServer').default;
  }

  describe('metrics setup', () => {
    it('collects default metrics', () => {
      load();
      expect(client.collectDefaultMetrics).toHaveBeenCalledTimes(1);
    });

    it('collects default metrics every ten seconds', () => {
      load();
      expect(client.collectDefaultMetrics).toHaveBeenCalledTimes(1);
      expect(client.collectDefaultMetrics.mock.calls[0][0]).toHaveProperty('timeout', 10 * 1e3);
    });

    it('collects garbage collection metrics', () => {
      load();
      expect(promGcStats).toHaveBeenCalledTimes(1);
      expect(promGcStats).toHaveBeenCalledWith(client.register);
    });

    it('warns if unable to collect garbage collection metrics', () => {
      console.warn.mockClear();
      load({ gcStatsError: true });
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn.mock.calls[0]).toMatchSnapshot();
    });
  });

  describe('unknown routes', () => {
    it('should return a 404 status', (done) => {
      request(load())
        .get('/doesnt-exist')
        .end((err, res) => {
          if (err) { return done(err); }
          expect(res.status).toEqual(404);
          return done();
        });
    });

    it('should return a blank page', (done) => {
      request(load())
        .get('/doesnt-exist')
        .end((err, res) => {
          if (err) { return done(err); }
          expect(res.text).toEqual('');
          expect(res.type).toEqual('text/plain');
          return done();
        });
    });

    it('should log the request', (done) => {
      logging.mockClear();
      process.env.NODE_ENV = 'production';

      const metricsServer = load();
      expect(logging).not.toHaveBeenCalled();

      request(metricsServer)
        .get('/doesnt-exist')
        .end(() => {
          expect(logging).toHaveBeenCalledTimes(1);
          done();
        });
    });
  });

  describe('/im-up', () => {
    it('should run health checks', (done) => {
      request(load())
        .get('/im-up')
        .end((err) => {
          if (err) { return done(err); }
          expect(healthCheck).toBeCalled();
          return done();
        });
    });

    it('should log the request', (done) => {
      logging.mockClear();

      request(load())
        .get('/im-up')
        .end(() => {
          expect(logging).toHaveBeenCalledTimes(1);
          done();
        });
    });
  });

  describe('/metrics', () => {
    it('should respond with metrics', (done) => {
      request(load())
        .get('/metrics')
        .end((err) => {
          if (err) { return done(err); }
          expect(client.register.metrics).toBeCalled();
          return done();
        });
    });

    it('should be Content-Type of metrics', (done) => {
      request(load())
        .get('/metrics')
        .end((err, res) => {
          if (err) { return done(err); }
          expect(res.type).toBe(`${client.register.contentType}`);
          return done();
        });
    });

    it('should log the request', (done) => {
      logging.mockClear();

      request(load())
        .get('/im-up')
        .end(() => {
          expect(logging).toHaveBeenCalledTimes(1);
          done();
        });
    });
  });
});
