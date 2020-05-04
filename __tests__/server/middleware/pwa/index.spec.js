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


import request from 'supertest';
import express from 'express';

import {
  createServiceWorkerEscapeHatchScript,
  readServiceWorkerRecoveryScript,
  readServiceWorkerScript,
  serviceWorkerMiddleware,
} from '../../../../src/server/middleware/pwa/service-worker';
import * as pwa from '../../../../src/server/middleware/pwa';

jest.mock('fs', () => ({
  readFileSync: (filePath) => (filePath.endsWith('noop.js') ? '[service-worker-noop-script]' : '[service-worker-script]'),
}));

describe('PWA', () => {
  test('should export components and router', () => {
    expect(Object.entries(pwa)).toMatchSnapshot();
  });
});

describe('PWA routing', () => {
  const defaultMatchAll = jest.fn((req, res) => {
    res.sendStatus(404);
  });

  const makeGetFrom = (app) => (url) => new Promise((resolve, reject) => {
    request(app)
      .get(url)
      .end((err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
  });

  const workerPath = '/_/pwa/service-worker.js';
  const mockWorker = readServiceWorkerScript();
  const mockRecoveryWorker = readServiceWorkerRecoveryScript();
  const mockEscapeHatchWorker = createServiceWorkerEscapeHatchScript().toString();
  const mockServiceWorkerScope = '/nested/scope';

  beforeEach(() => jest.clearAllMocks());
  beforeAll(() => {
    process.env.ONE_SERVICE_WORKER = true;
    pwa.configurePWA({
      serviceWorker: true,
    });
  });

  const app = express()
    .get(workerPath, serviceWorkerMiddleware())
    .get('*', defaultMatchAll);
  const get = makeGetFrom(app);

  [
    [workerPath, 'application/javascript; charset=utf-8', mockWorker],
  ].forEach((pair) => {
    const [route, contentType, mockResponse] = pair;

    it(`should respond with a status of 200 at ${route}`, async () => {
      expect.assertions(3);
      const response = await get(route);
      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('content-type', contentType);
      expect(response.text).toBe(mockResponse);
    });
  });

  describe('disabled', () => {
    beforeAll(() => {
      pwa.configurePWA({
        serviceWorker: false,
      });
    });

    [
      [workerPath, 404],
    ].forEach((pair) => {
      const [route, status] = pair;

      it(`should respond with a status of ${status} when disabled at ${route}`, async () => {
        expect.assertions(1);
        const response = await get(route);
        expect(response.status).toBe(status);
      });
    });
  });

  describe('recovery mode', () => {
    beforeAll(() => {
      pwa.configurePWA({
        recoveryMode: true,
      });
    });

    [
      [workerPath, 'application/javascript; charset=utf-8', mockRecoveryWorker],
    ].forEach((pair) => {
      const [route, contentType, mockResponse] = pair;

      it(`should respond with recovery asset at ${route}`, async () => {
        expect.assertions(3);
        const response = await get(route);
        expect(response.status).toBe(200);
        expect(response.headers).toHaveProperty('content-type', contentType);
        expect(response.text).toBe(mockResponse);
      });
    });
  });

  describe('escape hatch worker', () => {
    beforeAll(() => {
      pwa.configurePWA({
        escapeHatch: true,
      });
    });

    [
      [workerPath, 'application/javascript; charset=utf-8', mockEscapeHatchWorker],
    ].forEach((pair) => {
      const [route, contentType, mockResponse] = pair;

      it(`should respond with a status of 404 when disabled at ${route}`, async () => {
        expect.assertions(3);
        const response = await get(route);
        expect(response.status).toBe(200);
        expect(response.headers).toHaveProperty('content-type', contentType);
        expect(response.text).toBe(mockResponse);
      });
    });
  });

  describe('setting scope', () => {
    beforeAll(() => {
      pwa.configurePWA({
        serviceWorker: true,
        scope: mockServiceWorkerScope,
      });
    });

    [
      [workerPath, mockServiceWorkerScope, mockWorker],
    ].forEach((pair) => {
      const [route, mockedScope, mockResponse] = pair;

      it(`should respond with a status of 404 when disabled at ${route}`, async () => {
        expect.assertions(3);
        const response = await get(route);
        expect(response.status).toBe(200);
        expect(response.headers).toHaveProperty('service-worker-allowed', mockedScope);
        expect(response.text).toBe(mockResponse);
      });
    });
  });
});
