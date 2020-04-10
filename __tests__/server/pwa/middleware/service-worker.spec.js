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

import * as serviceWorker from '../../../../src/server/pwa/middleware/service-worker';

const {
  serviceWorkerMiddleware,
  getServiceWorkerEnabled,
  getServiceWorkerScript,
  getServiceWorkerScope,
  getServiceWorkerType,
  setServiceWorkerScript,
  configureServiceWorker,
  createServiceWorkerScript,
  createServiceWorkerEscapeHatchScript,
  createServiceWorkerNoopScript,
} = serviceWorker;

jest.mock('fs', () => ({
  readFileSync: (filePath) => ({ toString: () => (filePath.endsWith('noop.js') ? '[service-worker-noop-script]' : '[service-worker-script]') }),
}));

describe('service worker middleware components', () => {
  test('should consistently export', () => {
    expect(Object.entries(serviceWorker)).toMatchSnapshot();
  });

  test('gets default values', () => {
    expect(getServiceWorkerEnabled()).toBe(false);
    expect(getServiceWorkerScript()).toBe(null);
    expect(getServiceWorkerScope()).toBe(null);
    expect(getServiceWorkerType()).toBe(null);
  });

  test('sets the service worker script and scope', () => {
    const script = '[service-worker-script]';
    const scope = '/my-scope';
    expect(setServiceWorkerScript(script, scope)).toEqual(script);
    expect(getServiceWorkerScope()).toEqual(scope);
    expect(getServiceWorkerScript()).toEqual(script);
  });

  test('sets the service worker script without scope', () => {
    const script = '[service-worker-script-without-scope-set]';
    const scope = '/';
    expect(setServiceWorkerScript(script)).toEqual(script);
    expect(getServiceWorkerScope()).toEqual(scope);
    expect(getServiceWorkerScript()).toEqual(script);
  });

  test('sets the service worker script to null', () => {
    const script = null;
    const scope = null;
    expect(setServiceWorkerScript(script)).toEqual(script);
    expect(getServiceWorkerScope()).toEqual(scope);
    expect(getServiceWorkerScript()).toEqual(script);
  });

  test('creates various types of service worker scripts', () => {
    expect(createServiceWorkerNoopScript()).toEqual('[service-worker-noop-script]');
    expect(createServiceWorkerScript()).toEqual('[service-worker-script]');
    expect(createServiceWorkerEscapeHatchScript()).toEqual('self.unregister();');
  });

  test('configuring the service worker without parameters will disable it', () => {
    expect(configureServiceWorker()).toBeUndefined();
    expect(getServiceWorkerScript()).toBe(null);
    expect(getServiceWorkerScope()).toBe(null);
    expect(getServiceWorkerEnabled()).toBe(false);
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
      configureServiceWorker({ enabled: true });

      expect(middleware(null, res, next)).toBe(res);

      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.type).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledTimes(2);
      expect(next).not.toHaveBeenCalled();
      expect(res.type).toHaveBeenCalledWith('js');
      expect(res.set).toHaveBeenCalledWith('Service-Worker-Allowed', getServiceWorkerScope());
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache');
      expect(res.send).toHaveBeenCalledWith(getServiceWorkerScript());
    });

    test('middleware responds with service worker noop script', () => {
      const middleware = serviceWorkerMiddleware();
      const next = jest.fn();
      const res = {};
      res.send = jest.fn(() => res);
      res.set = jest.fn(() => res);
      res.type = jest.fn(() => res);
      configureServiceWorker({ noop: true });

      expect(middleware(null, res, next)).toBe(res);

      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.type).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledTimes(2);
      expect(next).not.toHaveBeenCalled();
      expect(res.type).toHaveBeenCalledWith('js');
      expect(res.set).toHaveBeenCalledWith('Service-Worker-Allowed', getServiceWorkerScope());
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache');
      expect(res.send).toHaveBeenCalledWith(createServiceWorkerNoopScript());
    });

    test('middleware responds with service worker escape hatch script', () => {
      const middleware = serviceWorkerMiddleware();
      const next = jest.fn();
      const res = {};
      res.send = jest.fn(() => res);
      res.set = jest.fn(() => res);
      res.type = jest.fn(() => res);
      configureServiceWorker({ escapeHatch: true });

      expect(middleware(null, res, next)).toBe(res);

      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.type).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledTimes(2);
      expect(next).not.toHaveBeenCalled();
      expect(res.type).toHaveBeenCalledWith('js');
      expect(res.set).toHaveBeenCalledWith('Service-Worker-Allowed', getServiceWorkerScope());
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache');
      expect(res.send).toHaveBeenCalledWith(createServiceWorkerEscapeHatchScript());
    });
  });
});
