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
  let healthCheck;
  let logging;

  function load() {
    jest.resetModules();

    jest.mock('prom-client');
    jest.mock('../../src/server/utils/logging/serverMiddleware', () => jest.fn((req, res, next) => next()));
    jest.mock('../../src/server/middleware/healthCheck');

    client = require('prom-client');
    logging = require('../../src/server/utils/logging/serverMiddleware');
    healthCheck = require('../../src/server/middleware/healthCheck').default;

    return require('../../src/server/metricsServer').default;
  }

  describe('metrics setup', () => {
    it('collects default metrics', () => {
      load();
      expect(client.collectDefaultMetrics).toHaveBeenCalledTimes(1);
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
