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
  expiration, cacheRouter, appShell, match, remove, createCacheName,
} from '@americanexpress/one-service-worker';

import createFetchMiddleware from '../../../../src/client/service-worker/events/fetch';

jest.mock('@americanexpress/one-service-worker', () => {
  const osw = jest.requireActual('@americanexpress/one-service-worker');
  Object.keys(osw).forEach((key) => {
    if (typeof osw[key] === 'function') jest.spyOn(osw, key);
  });
  return osw;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function waitFor(asyncTarget, getTarget = () => asyncTarget.mock.calls) {
  return Promise.all(getTarget().reduce((array, next) => array.concat(next), []));
}

function createFetchRequestResponse(url) {
  const request = new Request(url);
  const response = new Response('body', { url: request.url });
  return [request, response];
}

function createFetchEvent(url = '/index.html') {
  const [request, response] = createFetchRequestResponse(url);
  const event = new global.FetchEvent('fetch', {
    request,
  });
  event.response = response;
  ['waitUntil', 'respondWith'].forEach((method) => {
    jest.spyOn(event, method);
  });
  event.waitForCompletion = async () => {
    await waitFor(event.respondWith);
    await waitFor(event.waitUntil);
  };
  return event;
}

function createFetchEventsChainForURLS(middleware, urls = [], initEvent) {
  return urls.reduce(async (lastPromises, url, index) => {
    const lastEvents = await lastPromises;
    const event = createFetchEvent(url);
    if (typeof initEvent === 'function') {
      initEvent(event, index);
    }
    middleware(event);
    await event.waitForCompletion();
    return Promise.resolve(lastEvents.concat(event));
  }, Promise.resolve([]));
}

function createServiceWorkerEnvironment(target = global) {
  const EventTarget = require('service-worker-mock/models/EventTarget');
  const createServiceWorkerMocks = require('service-worker-mock');

  Object.assign(
    target,
    createServiceWorkerMocks(),
    Object.assign(new EventTarget(), {
      addEventListener(type, listener) {
        if (this.listeners.has(type)) {
          this.listeners.get(type).add(listener);
        } else {
          this.listeners.set(type, new Set([listener]));
        }
      },
    }),
    {
      oninstall: null,
      onactivate: null,
      onfetch: null,
    }
  );
  const { match: nativeMatch, matchAll } = target.Cache.prototype;
  // eslint-disable-next-line no-param-reassign
  target.Cache.prototype.match = function matchCorrected(...args) {
    return nativeMatch.call(this, ...args).then((result) => (result && result.clone()) || null);
  };
  // eslint-disable-next-line no-param-reassign
  target.Cache.prototype.matchAll = function matchAllCorrected(...args) {
    return matchAll
      .call(this, ...args)
      .then((results) => (results && results.map((result) => result.clone())) || []);
  };
  // eslint-disable-next-line no-param-reassign
  target.fetch = jest.fn((url) => {
    const [, response] = createFetchRequestResponse(url);
    return Promise.resolve(response);
  });
}

describe('createFetchMiddleware', () => {
  beforeAll(() => {
    process.env.ONE_APP_BUILD_VERSION = '5.0.0';
    process.env.HOLOCRON_MODULE_MAP = '{ "modules": {} }';
  });

  test('createFetchMiddleware exports a function and calls middleware', () => {
    expect(createFetchMiddleware()).toBeInstanceOf(Function);
    expect(appShell).toHaveBeenCalledTimes(1);
    expect(cacheRouter).toHaveBeenCalledTimes(1);
    expect(expiration).toHaveBeenCalledTimes(1);
  });

  describe('offline support', () => {
    beforeAll(() => {
      createServiceWorkerEnvironment();
    });

    test('caches the core offline responses when fetched', async () => {
      expect.assertions(4);

      const middleware = createFetchMiddleware();
      await createFetchEventsChainForURLS(middleware, [
        '/_/pwa/shell',
        '/_/pwa/manifest.webmanifest',
      ]);

      expect(fetch).toHaveBeenCalledTimes(2);
      await expect(match(new Request('http://localhost/_/pwa/shell'))).resolves.toBeInstanceOf(Response);
      await expect(match(new Request('http://localhost/_/pwa/manifest.webmanifest'))).resolves.toBeInstanceOf(Response);
      expect(caches.snapshot()).toMatchObject({
        '__sw/offline': {
          'http://localhost/_/pwa/shell': expect.any(Response),
          'http://localhost/_/pwa/manifest.webmanifest': expect.any(Response),
        },
      });
    });

    test('responds from cache when resources are offline', async () => {
      expect.assertions(3);

      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        writable: true,
        value: false,
      });

      const middleware = createFetchMiddleware();
      const events = await createFetchEventsChainForURLS(middleware, [
        '/_/pwa/shell',
        '/_/pwa/manifest.webmanifest',
      ], (event, index) => {
        // eslint-disable-next-line no-param-reassign
        if (index === 0) event.request.mode = 'navigate';
      });

      expect(fetch).toHaveBeenCalledTimes(0);
      events.forEach((event) => {
        expect(event.respondWith).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('caching', () => {
    const setOneAppVersion = (version = '1.2.3-rc.4-abc123') => {
      process.env.ONE_APP_BUILD_VERSION = version;
    };
    const setModuleMap = (moduleMap = { modules: {} }) => {
      process.env.HOLOCRON_MODULE_MAP = JSON.stringify(moduleMap);
    };

    beforeEach(() => {
      setOneAppVersion();
      setModuleMap({
        clientCacheRevision: '123',
        modules: {
          'test-root': {
            baseUrl: 'https://example.com/cdn/modules/test-root/2.2.2',
          },
          'child-module': {
            baseUrl: 'https://cdn.example.com/nested/cdn/path/modules/child-module/2.3.4/',
          },
          'alt-child-module': {
            baseUrl: 'https://example.com/alt-child-module/3.4.5/',
          },
          'local-module': {
            baseUrl: 'http://localhost:3001/static/modules/local-module/4.5.6/',
          },
        },
      });
    });

    describe('not caching invalid urls', () => {
      beforeAll(() => {
        createServiceWorkerEnvironment();
      });

      test('does not match any of the preset routers and does nothing with expiration or invalidation', async () => {
        const middleware = createFetchMiddleware();
        const events = await createFetchEventsChainForURLS(middleware, [
          // module urls
          'https://example.com/index.html',
          'https://example.com/index.browser.js',
          'https://example.com/test-root.browser.js',
          'https://example.com/modules/test-root.legacy.browser.js',
          'https://example.com/modules/test-root/test-root.legacy.browser.js',
          'https://example.com/modules/test-root/2.2.2/test-root.legacy.browser.js',
          'https://example.com/test-root/Chunk.test-root.browser.js',
        ]);

        expect.assertions(3 * events.length);
        events.forEach((event) => {
          // expect no activity to cache the response or attribute meta-data
          expect(event.waitUntil).not.toHaveBeenCalled();
          // expect no responses from middleware
          expect(event.respondWith).not.toHaveBeenCalled();
          // expect nothing set on the cache
          expect(caches.snapshot()).toEqual({});
        });
      });
    });

    describe('caching valid urls', () => {
      let middleware;

      beforeAll(() => {
        createServiceWorkerEnvironment();
        middleware = createFetchMiddleware();
      });

      const urls = new Map([
        [
          'one-app',
          [
            'https://example.com/cdn/app/1.2.3-rc.4-abc123/vendors.js',
            'https://cdn.example.com/static/cdn/app/1.2.3-rc.4-abc123/app~vendors.js',
            'https://cdn.example.com/cdn/app/1.2.3-rc.4-abc123/legacy/i18n/de-DE.js',
            'https://example.com/cdn/app/1.2.3-rc.4-abc123/i18n/es-MX.js',
            'https://example.com/_/static/app/1.2.3-rc.4-abc123/runtime.js',
            'https://example.com/_/static/app/1.2.3-rc.4-abc123/i18n/en-US.js',
            'https://example.com/_/static/app/1.2.3-rc.4-abc123/app.js',
            'https://example.com/static/app/1.2.3-rc.4-abc123/legacy/app.js',
            'https://cdn.example.com/cdn/app/1.2.3-rc.4-abc123/legacy/app~vendors.js',
            'https://example.com/_/static/app/1.2.3-rc.4-abc123/legacy/i18n/en-US.js',
            // during development
            'http://localhost:3001/static/app/1.2.3-rc.4-abc123/i18n/en-US.js',
            'http://localhost:3000/_/static/app/1.2.3-rc.4-abc123/app.js',
          ],
        ],
        [
          'modules',
          [
            // bare essentials
            'https://example.com/cdn/modules/test-root/2.2.2/test-root.browser.js',
            'https://cdn.example.com/nested/cdn/path/modules/child-module/2.3.4/child-module.browser.js',
            'https://example.com/alt-child-module/3.4.5/alt-child-module.browser.js?clientCacheRevision=123',
            // legacy module
            'https://example.com/cdn/modules/test-root/2.2.2/test-root.legacy.browser.js',
            // chunks
            'https://example.com/cdn/modules/test-root/2.2.2/TestRootChunk.test-root.chunk.browser.js',
            'https://example.com/cdn/modules/test-root/2.2.2/TestRootChunk.test-root.chunk.legacy.browser.js',
            // clientCacheRevision key
            'https://example.com/cdn/modules/test-root/2.2.2/test-root.browser.js?clientCacheRevision=123',
            // during development
            'http://localhost:3001/static/modules/local-module/4.5.6/local-root.browser.js',
            'http://localhost:3001/static/modules/local-module/4.5.6/local-root.legacy.browser.js?clientCacheRevision=123',
          ],
        ],
        [
          'lang-packs',
          [
            // lang-packs
            'https://example.com/cdn/modules/test-root/2.2.2/en-US/test-root.json',
            'https://cdn.example.com/nested/cdn/path/modules/child-module/2.3.4/de-DE/child-module.json',
            'https://example.com/cdn/modules/test-root/2.2.2/locale/zs-ASFJKHASKF/test-root.json',
            'https://cdn.example.com/nested/cdn/path/modules/child-module/2.3.4/fr-FR/integration.json',
            // during development
            'http://localhost:3001/static/modules/local-module/4.5.6/en-us/integration.json',
            'http://localhost:3001/static/modules/local-module/4.5.6/locale/en-CA/local-module.json',
            'http://localhost:3001/static/modules/local-module/4.5.6/en/production.json',
          ],
        ],
      ]);

      urls.forEach((urlsToTest, cacheName) => {
        urlsToTest.forEach((url) => {
          test(`matches (${cacheName}) ${url}`, async () => {
            const event = createFetchEvent(url);
            middleware(event);
            await event.waitForCompletion();
            const {
              clone, json, text, ...eventResponse
            } = event.response;
            await expect(
              match(url, { cacheName: createCacheName(cacheName) })
            ).resolves.toEqual(eventResponse);
          });
        });
      });
    });

    describe('invalidation', () => {
      beforeEach(() => {
        // clear all internal caches already used
        caches.caches = {};
      });

      test('caches all app assets and invalidates app version', async () => {
        expect.assertions(11);

        const createOneAppEvents = async (oneAppVersion) => {
          const middleware = createFetchMiddleware({ oneAppVersion });
          const events = await createFetchEventsChainForURLS(middleware, [
            `https://example.com/cdn/app/${oneAppVersion}/app~vendors.js`,
            `https://example.com/cdn/app/${oneAppVersion}/vendors.js`,
            `https://example.com/cdn/app/${oneAppVersion}/runtime.js`,
            `https://example.com/cdn/app/${oneAppVersion}/i18n/en-US.js`,
            `https://example.com/cdn/app/${oneAppVersion}/app.js`,
          ]);
          return events;
        };

        const oldVersionEvents = await createOneAppEvents('0.1.2');
        const newVersionEvents = await createOneAppEvents('1.2.3-rc.4-abc123');
        expect(fetch).toHaveBeenCalledTimes(10);

        await Promise.all(newVersionEvents.map(async (event) => {
          await expect(match(event.request)).resolves.toBeInstanceOf(Response);
        }));

        await Promise.all(oldVersionEvents.map(async (event) => {
          await expect(match(event.request)).resolves.toBe(null);
        }));
      });

      test('caches only one language pack per module and invalidates the existing lang pack', async () => {
        expect.assertions(12);

        const middleware = createFetchMiddleware();
        const events = await createFetchEventsChainForURLS(middleware, [
          'https://example.com/cdn/modules/test-root/2.2.2/test-root.browser.js',
          'https://example.com/cdn/modules/test-root/2.2.2/locale/en-US/test-root.json',
          'https://example.com/cdn/modules/test-root/2.2.2/locale/en-CA/test-root.json',
        ]);

        expect(fetch).toHaveBeenCalledTimes(3);
        events.forEach((event, index) => {
          expect(event.respondWith).toHaveBeenCalledTimes(1);
          expect(event.respondWith).toHaveBeenCalledWith(Promise.resolve(event.response));
          // on the third and final call, we expect to waitUntil the original
          // cache item was removed as an additional step when invalidating
          expect(event.waitUntil).toHaveBeenCalledTimes(index === 2 ? 4 : 3);
        });
        await expect(match(new Request('https://example.com/cdn/modules/test-root/2.2.2/locale/en-US/test-root.json'))).resolves.toBe(null);
        await expect(match(new Request('https://example.com/cdn/modules/test-root/2.2.2/locale/en-CA/test-root.json'))).resolves.toBeInstanceOf(Response);
      });

      test('caches a module and invalidates with differing `clientCacheRevision` key', async () => {
        expect.assertions(10);

        let middleware = createFetchMiddleware();

        const url = 'https://example.com/cdn/modules/test-root/2.2.2/test-root.browser.js?clientCacheRevision=123';
        const event = createFetchEvent(url);
        fetch.mockImplementationOnce(() => Promise.resolve(event.response));
        middleware(event);
        await event.waitForCompletion();

        expect(event.waitUntil).toHaveBeenCalledTimes(3);
        expect(event.respondWith).toHaveBeenCalledTimes(1);
        expect(event.respondWith).toHaveBeenCalledWith(Promise.resolve(event.response));

        // a second response with a differing clientCacheRevision key

        setModuleMap({
          ...JSON.parse(process.env.HOLOCRON_MODULE_MAP),
          clientCacheRevision: 'def',
        });

        middleware = createFetchMiddleware();

        const nextUrl = 'https://example.com/cdn/modules/test-root/2.2.2/test-root.browser.js?clientCacheRevision=def';
        const nextEvent = createFetchEvent(nextUrl);
        middleware(nextEvent);
        await nextEvent.waitForCompletion();

        expect(nextEvent.waitUntil).toHaveBeenCalledTimes(4);
        expect(remove).toHaveBeenCalledTimes(1);
        expect(nextEvent.respondWith).toHaveBeenCalledTimes(1);
        expect(nextEvent.respondWith).toHaveBeenCalledWith(Promise.resolve(nextEvent.response));

        const cachesSnapShot = caches.snapshot();
        expect(cachesSnapShot['__sw/modules'][url]).toBeUndefined();
        expect(cachesSnapShot['__sw/modules'][nextUrl]).toEqual(nextEvent.response);
        expect(
          JSON.parse(cachesSnapShot['__sw/__meta']['http://localhost/__sw/__meta/modules/test-root/test-root.browser.js'].body.parts.join(''))
        ).toEqual({
          name: 'test-root',
          version: '2.2.2',
          path: '/test-root.browser.js',
          revision: 'def',
          type: 'modules',
          url: nextUrl,
          cacheName: '__sw/modules',
        });
      });

      test('caches a module and invalidates with differing module `version`', async () => {
        expect.assertions(10);

        let middleware = createFetchMiddleware();

        const url = 'https://example.com/cdn/modules/test-root/2.2.2/test-root.browser.js';
        const event = createFetchEvent(url);
        fetch.mockImplementationOnce(() => Promise.resolve(event.response));
        middleware(event);
        await event.waitForCompletion();

        expect(event.waitUntil).toHaveBeenCalledTimes(3);
        expect(event.respondWith).toHaveBeenCalledTimes(1);
        expect(event.respondWith).toHaveBeenCalledWith(Promise.resolve(event.response));

        // a second response with a differing module version

        setModuleMap({
          clientCacheRevision: '123',
          modules: {
            'test-root': {
              baseUrl: 'https://example.com/cdn/modules/test-root/3.2.1',
            },
          },
        });

        middleware = createFetchMiddleware();

        const nextUrl = 'https://example.com/cdn/modules/test-root/3.2.1/test-root.browser.js';
        const nextEvent = createFetchEvent(nextUrl);
        middleware(nextEvent);
        await nextEvent.waitForCompletion();

        expect(nextEvent.waitUntil).toHaveBeenCalledTimes(4);
        expect(remove).toHaveBeenCalledTimes(1);
        expect(nextEvent.respondWith).toHaveBeenCalledTimes(1);
        expect(nextEvent.respondWith).toHaveBeenCalledWith(Promise.resolve(nextEvent.response));

        const cachesSnapShot = caches.snapshot();
        expect(cachesSnapShot['__sw/modules'][url]).toBeUndefined();
        expect(cachesSnapShot['__sw/modules'][nextUrl]).toEqual(nextEvent.response);
        expect(
          JSON.parse(cachesSnapShot['__sw/__meta']['http://localhost/__sw/__meta/modules/test-root/test-root.browser.js'].body.parts.join(''))
        ).toEqual({
          name: 'test-root',
          version: '3.2.1',
          path: '/test-root.browser.js',
          revision: '123',
          type: 'modules',
          url: nextUrl,
          cacheName: '__sw/modules',
        });
      });
    });
  });
});
