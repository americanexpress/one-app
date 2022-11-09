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

import serviceWorkerMiddleware from '../../../../src/server/middleware/pwa/service-worker';
import { getServerPWAConfig } from '../../../../src/server/middleware/pwa/config';
import { getClientModuleMapCache } from '../../../../src/server/utils/clientModuleMapCache';

jest.mock('../../../../src/server/middleware/pwa/config');
jest.mock('../../../../src/server/utils/clientModuleMapCache');

const serviceWorkerStandardScript = '[service-worker-script]';
const serviceWorkerRecoveryScript = '[service-worker-recovery-script]';
const serviceWorkerEscapeHatchScript = '[service-worker-escape-hatch-script]';
function createServiceWorkerConfig({ type, scope } = {}) {
  let serviceWorker = false;
  let serviceWorkerScope = null;
  let serviceWorkerScript = null;
  if (type === 'standard') serviceWorkerScript = serviceWorkerStandardScript;
  else if (type === 'recovery') serviceWorkerScript = serviceWorkerRecoveryScript;
  else if (type === 'escape-hatch') serviceWorkerScript = serviceWorkerEscapeHatchScript;
  if (type) {
    serviceWorker = true;
    serviceWorkerScope = scope || '/';
  }
  return {
    serviceWorker,
    serviceWorkerScope,
    serviceWorkerScript,
  };
}

beforeAll(() => {
  getClientModuleMapCache.mockImplementation(() => ({
    browser: { modules: {} },
  }));
});

describe('service worker middleware', () => {
  test('middleware factory returns function', () => {
    expect(serviceWorkerMiddleware()).toBeInstanceOf(Function);
  });

  test('middleware calls next when disabled', () => {
    getServerPWAConfig.mockImplementationOnce(() => createServiceWorkerConfig());

    const middleware = serviceWorkerMiddleware();
    const next = jest.fn();
    expect(middleware(null, null, next)).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('middleware responds with service worker script', () => {
    getServerPWAConfig.mockImplementationOnce(() => createServiceWorkerConfig({ type: 'standard' }));

    const middleware = serviceWorkerMiddleware();
    const next = jest.fn();
    const res = {};
    res.send = jest.fn(() => res);
    res.set = jest.fn(() => res);
    res.type = jest.fn(() => res);

    expect(middleware(null, res, next)).toBe(res);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.type).toHaveBeenCalledTimes(1);
    expect(res.set).toHaveBeenCalledTimes(2);
    expect(next).not.toHaveBeenCalled();
    expect(res.type).toHaveBeenCalledWith('js');
    expect(res.set).toHaveBeenCalledWith('Service-Worker-Allowed', '/');
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache');
    expect(res.send).toHaveBeenCalledWith(Buffer.from(serviceWorkerStandardScript));
  });

  test('middleware responds with service worker noop script', () => {
    getServerPWAConfig.mockImplementationOnce(() => createServiceWorkerConfig({ type: 'recovery' }));

    const middleware = serviceWorkerMiddleware();
    const next = jest.fn();
    const res = {};
    res.send = jest.fn(() => res);
    res.set = jest.fn(() => res);
    res.type = jest.fn(() => res);

    expect(middleware(null, res, next)).toBe(res);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.type).toHaveBeenCalledTimes(1);
    expect(res.set).toHaveBeenCalledTimes(2);
    expect(next).not.toHaveBeenCalled();
    expect(res.type).toHaveBeenCalledWith('js');
    expect(res.set).toHaveBeenCalledWith('Service-Worker-Allowed', '/');
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache');
    expect(res.send).toHaveBeenCalledWith(Buffer.from(serviceWorkerRecoveryScript));
  });

  test('middleware responds with service worker escape hatch script', () => {
    getServerPWAConfig.mockImplementationOnce(() => createServiceWorkerConfig({ type: 'escape-hatch' }));

    const middleware = serviceWorkerMiddleware();
    const next = jest.fn();
    const res = {};
    res.send = jest.fn(() => res);
    res.set = jest.fn(() => res);
    res.type = jest.fn(() => res);

    expect(middleware(null, res, next)).toBe(res);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.type).toHaveBeenCalledTimes(1);
    expect(res.set).toHaveBeenCalledTimes(2);
    expect(next).not.toHaveBeenCalled();
    expect(res.type).toHaveBeenCalledWith('js');
    expect(res.set).toHaveBeenCalledWith('Service-Worker-Allowed', '/');
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache');
    expect(res.send).toHaveBeenCalledWith(Buffer.from(serviceWorkerEscapeHatchScript));
  });

  test('replaces HOLOCRON_MODULE_MAP in service worker script', () => {
    getServerPWAConfig.mockImplementationOnce(() => {
      const config = createServiceWorkerConfig({ type: 'standard' });
      config.serviceWorkerScript = 'process.env.HOLOCRON_MODULE_MAP';
      return config;
    });

    const middleware = serviceWorkerMiddleware();
    const next = jest.fn();
    const res = {};
    res.send = jest.fn(() => res);
    res.set = jest.fn(() => res);
    res.type = jest.fn(() => res);

    expect(middleware(null, res, next)).toBe(res);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.type).toHaveBeenCalledTimes(1);
    expect(res.set).toHaveBeenCalledTimes(2);
    expect(next).not.toHaveBeenCalled();
    expect(res.type).toHaveBeenCalledWith('js');
    expect(res.set).toHaveBeenCalledWith('Service-Worker-Allowed', '/');
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache');
    expect(res.send).toHaveBeenCalledWith(Buffer.from(`'${JSON.stringify(getClientModuleMapCache().browser)}'`));
  });
});
