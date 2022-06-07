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
  jest.mock('../../src/server/metrics/intl-cache', () => ({
    cacheSizeCollector: 'cacheSizeCollector',
  }));
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
    it('should return a 404 status', async () => {
      const res = await request(load())
        .get('/doesnt-exist');
      expect(res.status).toEqual(404);
    });

    it('should return a blank page', async () => {
      const res = await request(load())
        .get('/doesnt-exist');
      expect(res.text).toEqual('');
      expect(res.type).toEqual('text/plain');
    });

    it('should log the request', async () => {
      logging.mockClear();
      process.env.NODE_ENV = 'production';

      const metricsServer = load();
      expect(logging).not.toHaveBeenCalled();

      await request(metricsServer)
        .get('/doesnt-exist');
      expect(logging).toHaveBeenCalledTimes(1);
    });
  });

  describe('/im-up', () => {
    it('should run health checks', async () => {
      await request(load())
        .get('/im-up');
      expect(healthCheck).toBeCalled();
    });

    it('should log the request', async () => {
      logging.mockClear();
      await request(load())
        .get('/im-up');
      expect(logging).toHaveBeenCalledTimes(1);
    });
  });

  describe('/metrics', () => {
    it('should respond with metrics', async () => {
      await request(load())
        .get('/metrics');
      expect(client.register.metrics).toBeCalled();
    });

    it('should be Content-Type of metrics', async () => {
      const res = await request(load())
        .get('/metrics');
      expect(res.type).toBe(`${client.register.contentType}`);
    });

    it('should log the request', async () => {
      logging.mockClear();
      await request(load())
        .get('/im-up');
      expect(logging).toHaveBeenCalledTimes(1);
    });
  });
});
