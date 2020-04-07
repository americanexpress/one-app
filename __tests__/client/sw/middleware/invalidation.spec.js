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
  isServiceWorker,
  isCacheStorageSupported,
  getMetaData,
} from '@americanexpress/one-service-worker';

import createInvalidationMiddleware from '../../../../src/client/sw/middleware/invalidation';

jest.mock('@americanexpress/one-service-worker', () => {
  const osw = jest.requireActual('@americanexpress/one-service-worker');
  Object.keys(osw).forEach((key) => typeof osw[key] === 'function' && jest.spyOn(osw, key));
  return osw;
});

function createFetchEvent(request = new Request('/modules/0a87sf89/my-awesome-frank/0.12.0/my-awesome-frank.browser.js')) {
  const event = new global.FetchEvent('fetch', {
    request,
  });
  ['waitUntil', 'respondWith'].forEach((method) => {
    event[method] = event[method].bind(event);
    jest.spyOn(event, method);
  });
  return event;
}

function loadServiceWorkerMock() {
  const createServiceWorkerMocks = require('service-worker-mock');

  Object.assign(
    global,
    createServiceWorkerMocks()
  );

  const { match, matchAll } = global.Cache.prototype;

  global.Cache.prototype.match = function matchCorrected(...args) {
    return match.call(this, ...args).then((result) => (result && result.clone()) || null);
  };
  global.Cache.prototype.matchAll = function matchAllCorrected(...args) {
    return matchAll
      .call(this, ...args)
      .then((results) => (results && results.map((result) => result.clone())) || []);
  };
}

function createMiddlewareContext(defaultContext) {
  const ctx = defaultContext || {};
  const context = {
    get(key) {
      if (key) return ctx[key];
      return ctx;
    },
    set(key, value) {
      ctx[key] = value;
      return ctx;
    },
  };
  return context;
}

function waitFor(asyncTarget) {
  return Promise.all(asyncTarget.mock.calls.reduce((array, next) => array.concat(next), []));
}

describe('createInvalidationMiddleware', () => {
  beforeAll(loadServiceWorkerMock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('exports a function as default', () => {
    expect.assertions(1);
    expect(createInvalidationMiddleware).toBeInstanceOf(Function);
  });

  describe('middleware', () => {
    const moduleChecksum = '0a87sf89';
    const moduleName = 'my-awesome-frank';
    const moduleVersion = '0.12.0';
    const moduleBundle = 'browser';
    const moduleUri = `/modules/${moduleChecksum}/${moduleName}/${moduleVersion}/${moduleName}.${moduleBundle}.js`;

    test('middleware do nothing when not in service worker', () => {
      expect.assertions(2);

      isServiceWorker.mockImplementation(() => false);
      const middleware = createInvalidationMiddleware();
      expect(middleware).toBeInstanceOf(Function);
      expect(middleware()).toBeUndefined();
      isServiceWorker.mockImplementation(() => true);
    });

    test('middleware do nothing when caching is not supported', () => {
      expect.assertions(2);

      isCacheStorageSupported.mockImplementation(() => false);
      const middleware = createInvalidationMiddleware();
      expect(middleware).toBeInstanceOf(Function);
      expect(middleware()).toBeUndefined();
      isCacheStorageSupported.mockImplementation(() => true);
    });

    test('middleware does nothing if context is not set with request', async () => {
      expect.assertions(1);

      const middleware = createInvalidationMiddleware();
      const context = createMiddlewareContext();
      const event = createFetchEvent('/module.js');
      middleware(event, context);

      expect(event.waitUntil).not.toHaveBeenCalled();
    });

    test('module resource is handled and added to meta cache', async () => {
      expect.assertions(2);

      const middleware = createInvalidationMiddleware();
      const event = createFetchEvent(moduleUri);
      const { request } = event;
      const cacheName = 'module-cache';
      const context = createMiddlewareContext({
        request,
        cacheName,
      });

      middleware(event, context);

      await waitFor(event.waitUntil);

      expect(event.waitUntil).toHaveBeenCalledTimes(1);
      await expect(getMetaData({ url: new Request(`/module/${moduleName}`).url })).resolves.toMatchObject({
        checksum: moduleChecksum,
        name: moduleName,
        version: moduleVersion,
        bundle: moduleBundle,
        type: 'module',
        url: 'http://localhost/modules/0a87sf89/my-awesome-frank/0.12.0/my-awesome-frank.browser.js',
      });
    });

    test('incoming module resource replaces older version', async () => {
      expect.assertions(2);

      const newModuleVersion = '0.13.0';

      const middleware = createInvalidationMiddleware();
      const event = createFetchEvent(moduleUri.replace(moduleVersion, newModuleVersion));
      const { request } = event;
      const cacheName = 'module-cache';
      const context = createMiddlewareContext({
        request,
        cacheName,
      });

      middleware(event, context);

      await waitFor(event.waitUntil);

      expect(event.waitUntil).toHaveBeenCalledTimes(2);
      await expect(getMetaData({ url: new Request(`/module/${moduleName}`).url })).resolves.toMatchObject({
        checksum: moduleChecksum,
        name: moduleName,
        version: newModuleVersion,
        bundle: moduleBundle,
        type: 'module',
        url: 'http://localhost/modules/0a87sf89/my-awesome-frank/0.13.0/my-awesome-frank.browser.js',
      });
    });
  });
});
