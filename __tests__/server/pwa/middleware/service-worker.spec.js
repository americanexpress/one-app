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

import {
  serviceWorkerMiddleware,
  configureServiceWorker,
  createServiceWorkerScript,
  createServiceWorkerEscapeHatchScript,
  createServiceWorkerRecoveryScript,
} from '../../../../src/server/pwa/middleware/service-worker';

jest.mock('fs', () => ({
  readFileSync: (filePath) => Buffer.from((filePath.endsWith('noop.js') ? '[service-worker-noop-script]' : '[service-worker-script]')),
}));

describe('service worker middleware components', () => {
  test('creates various types of service worker scripts', () => {
    expect(createServiceWorkerRecoveryScript().toString()).toEqual('[service-worker-noop-script]');
    expect(createServiceWorkerScript().toString()).toEqual('[service-worker-script]');
    expect(createServiceWorkerEscapeHatchScript().toString()).toEqual('self.unregister();');
  });

  describe('middleware and various configurations', () => {
    beforeAll(configureServiceWorker);

    test('middleware factory returns function', () => {
      expect(serviceWorkerMiddleware()).toBeInstanceOf(Function);
    });

    test('middleware calls next when disabled', () => {
      const middleware = serviceWorkerMiddleware();
      const next = jest.fn();
      expect(middleware(null, null, next)).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('middleware responds with service worker script', () => {
      const middleware = serviceWorkerMiddleware();
      const next = jest.fn();
      const res = {};
      res.send = jest.fn(() => res);
      res.set = jest.fn(() => res);
      res.type = jest.fn(() => res);
      configureServiceWorker({ type: 'standard' });

      expect(middleware(null, res, next)).toBe(res);

      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.type).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledTimes(2);
      expect(next).not.toHaveBeenCalled();
      expect(res.type).toHaveBeenCalledWith('js');
      expect(res.set).toHaveBeenCalledWith('Service-Worker-Allowed', '/');
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache');
      expect(res.send).toHaveBeenCalledWith(createServiceWorkerScript());
    });

    test('middleware responds with service worker noop script', () => {
      const middleware = serviceWorkerMiddleware();
      const next = jest.fn();
      const res = {};
      res.send = jest.fn(() => res);
      res.set = jest.fn(() => res);
      res.type = jest.fn(() => res);
      configureServiceWorker({ type: 'recovery' });

      expect(middleware(null, res, next)).toBe(res);

      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.type).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledTimes(2);
      expect(next).not.toHaveBeenCalled();
      expect(res.type).toHaveBeenCalledWith('js');
      expect(res.set).toHaveBeenCalledWith('Service-Worker-Allowed', '/');
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache');
      expect(res.send).toHaveBeenCalledWith(createServiceWorkerRecoveryScript());
    });

    test('middleware responds with service worker escape hatch script', () => {
      const middleware = serviceWorkerMiddleware();
      const next = jest.fn();
      const res = {};
      res.send = jest.fn(() => res);
      res.set = jest.fn(() => res);
      res.type = jest.fn(() => res);
      configureServiceWorker({ type: 'escape-hatch' });

      expect(middleware(null, res, next)).toBe(res);

      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.type).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledTimes(2);
      expect(next).not.toHaveBeenCalled();
      expect(res.type).toHaveBeenCalledWith('js');
      expect(res.set).toHaveBeenCalledWith('Service-Worker-Allowed', '/');
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache');
      expect(res.send).toHaveBeenCalledWith(createServiceWorkerEscapeHatchScript());
    });
  });
});
