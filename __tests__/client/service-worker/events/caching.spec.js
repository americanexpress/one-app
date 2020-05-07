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
  expiration, cacheRouter, remove, match,
} from '@americanexpress/one-service-worker';

import { createCachingMiddleware } from '../../../../src/client/service-worker/events/caching';

jest.mock('@americanexpress/one-service-worker', () => {
  const osw = jest.requireActual('@americanexpress/one-service-worker');
  Object.keys(osw).forEach((key) => {
    if (typeof osw[key] === 'function') jest.spyOn(osw, key);
  });
  return osw;
});

beforeAll(() => {
  const { buildVersion } = require('../../../../.build-meta.json');
  process.env.ONE_APP_BUILD_VERSION = buildVersion;
});

beforeEach(() => {
  jest.clearAllMocks();
});

export function createFetchEvent(url = '/index.html') {
  const request = new Request(url);
  const response = new Response('body', { url: request.url });
  ['json', 'text', 'clone'].forEach((method) => {
    response[method] = response[method].bind(response);
    jest.spyOn(response, method);
  });
  const event = new global.FetchEvent('fetch', {
    request,
  });
  event.response = response;
  ['waitUntil', 'respondWith'].forEach((method) => {
    event[method] = event[method].bind(event);
    jest.spyOn(event, method);
  });
  return event;
}

export function createServiceWorkerEnvironment(target = global) {
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
  target.fetch = jest.fn(() => Promise.resolve({
    json: jest.fn(() => Promise.resolve()),
    text: jest.fn(() => Promise.resolve()),
    // eslint-disable-next-line no-restricted-globals
    clone: jest.fn(new Response(null, { url: self.location })),
  }));
}

function waitFor(asyncTarget) {
  return Promise.all(asyncTarget.mock.calls.reduce((array, next) => array.concat(next), []));
}

describe('createCachingMiddleware', () => {
  test('createCachingMiddleware exports a function and calls middleware', () => {
    expect(createCachingMiddleware()).toBeInstanceOf(Function);
    expect(cacheRouter).toHaveBeenCalledTimes(3);
    expect(expiration).toHaveBeenCalledTimes(1);
  });

  describe('not caching invalid urls', () => {
    beforeAll(() => {
      createServiceWorkerEnvironment();
    });

    test('does not match any of the preset routers and does nothing with expiration or invalidation', async () => {
      const middleware = createCachingMiddleware();
      const invalidUrls = [
        // module urls
        'https://example.com/index.html',
        'https://example.com/index.browser.js',
        'https://example.com/test-root.browser.js',
        'https://example.com/modules/test-root.legacy.browser.js',
        'https://example.com/modules/test-root/test-root.legacy.browser.js',
        'https://example.com/test-root/Chunk.test-root.browser.js',
      ];

      expect.assertions(3 * invalidUrls.length);

      await Promise.all(invalidUrls.map(async (url) => {
        const event = createFetchEvent(url);
        fetch.mockImplementationOnce(() => Promise.resolve(event.response));
        middleware(event);

        await waitFor(event.respondWith);
        await waitFor(event.waitUntil);
        // expect no activity to cache the response or attribute meta-data
        expect(event.waitUntil).not.toHaveBeenCalled();
        // expect no responses from middleware
        expect(event.respondWith).not.toHaveBeenCalled();
        // we should expect nothing set in the cache
        expect(caches.snapshot()).toEqual({});
      }));
    });
  });

  describe('caching valid urls', () => {
    let middleware;

    beforeAll(() => {
      createServiceWorkerEnvironment();
      middleware = createCachingMiddleware();
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
          'https://example.com/_/static/app/1.2.3-rc.4-abc123/legacy/app.js',
          'https://cdn.example.com/cdn/app/1.2.3-rc.4-abc123/legacy/app~vendors.js',
          'https://example.com/_/static/app/1.2.3-rc.4-abc123/legacy/i18n/en-US.js',
          // during development
          'http://localhost:3001/static/app/1.2.3-rc.4-abc123/i18n/en-US.js',
          'http://localhost:3000/_/static/app/1.2.3-rc.4-abc123/app.js',
        ],
      ],
      [
        'module',
        [
          // bare essentials
          'http://example.com/test-root/2.2.2/test-root.browser.js',
          'https://example.com/cdn/test-root/2.2.2/test-root.browser.js',
          // legacy module
          'https://example.com/cdn/test-root/2.2.2/test-root.legacy.browser.js',
          // chunks
          'https://example.com/cdn/test-root/2.2.2/TestRootChunk.test-root.chunk.browser.js',
          'https://example.com/cdn/test-root/2.2.2/TestRootChunk.test-root.chunk.legacy.browser.js',
          // clientCacheRevision key
          'https://example.com/cdn/test-root/2.2.2/test-root.browser.js?clientCacheRevision=123',
          // nested routes
          'https://example.com/cdn/static/modules/test-root/1.4.8/test-root.browser.js?clientCacheRevision=123',
          'https://cdn.example.com/cdn/nest/extra-nesting/one-app/modules/test-root/2.2.2/test-root.browser.js?clientCacheRevision=123',
          // during development
          'https://localhost:3001/static/modules/test-root/2.2.2/test-root.browser.js?clientCacheRevision=123',
          'https://localhost:3000/_/static/modules/test-root/2.3.5/test-root.browser.js?clientCacheRevision=123',
        ],
      ],
      [
        'lang-pack',
        [
          // lang-packs
          'https://cdn.example.com/cdn/static/modules/test-root/2.2.2/locale/en-US/test-root.json',
          'https://cdn.example.com/static/modules/test-root/2.3.4/locale/de-DE/test-root.json',
          'https://cdn.example.com/cdn/static/modules/test-root/2.2.2/locale/zs-ASFJKHASKF/test-root.json',
          'https://cdn.example.com/cdn/test-root/1.2.3-rc.4/locale/fr-FR/integration.json',
          'https://example.com/cdn/test-module/2.2.1/locale/en/production.json',
          // during development
          'http://localhost:3001/static/modules/franks-burgers/0.0.0/en-us/integration.json',
          'http://localhost:3001/static/modules/test-module/2.2.1/locale/en-CA/test-module.json',
          'http://localhost:3000/_/static/modules/test-module/2.2.1/locale/en/production.json',
        ],
      ],
    ]);

    urls.forEach((urlsToTest, name) => {
      const cacheName = `__sw/${name}-cache`;
      urlsToTest.forEach((url) => {
        test(`matches ${url}`, async () => {
          const event = createFetchEvent(url);
          fetch.mockImplementationOnce(() => Promise.resolve(event.response));
          middleware(event);
          await waitFor(event.respondWith);
          await waitFor(event.waitUntil);
          const {
            clone, json, text, ...eventResponse
          } = event.response;
          await expect(match(url, { cacheName })).resolves.toEqual(eventResponse);
        });
      });
    });
  });
});

describe('caching', () => {
  beforeEach(() => {
    createServiceWorkerEnvironment();
  });

  test('caches all app assets and overwrites initial legacy bundle items', async () => {
    expect.assertions(31);

    const middleware = createCachingMiddleware();

    const events = await [
      // legacy
      'https://example.com/_/static/app/1.2.3-rc.4-abc123/legacy/app~vendors.js',
      'https://example.com/_/static/app/1.2.3-rc.4-abc123/legacy/vendors.js',
      'https://example.com/_/static/app/1.2.3-rc.4-abc123/legacy/runtime.js',
      'https://example.com/_/static/app/1.2.3-rc.4-abc123/legacy/i18n/en-US.js',
      'https://example.com/_/static/app/1.2.3-rc.4-abc123/legacy/app.js',
      // modern
      'https://example.com/cdn/app/1.2.3-rc.4-abc123/app~vendors.js',
      'https://example.com/cdn/app/1.2.3-rc.4-abc123/vendors.js',
      'https://example.com/cdn/app/1.2.3-rc.4-abc123/runtime.js',
      'https://example.com/cdn/app/1.2.3-rc.4-abc123/i18n/en-US.js',
      'https://example.com/cdn/app/1.2.3-rc.4-abc123/app.js',
    ].reduce(async (lastPromises, url) => {
      const lastEvents = await lastPromises;
      const event = createFetchEvent(url);
      fetch.mockImplementationOnce(() => Promise.resolve(event.response));
      middleware(event);
      await waitFor(event.respondWith);
      await waitFor(event.waitUntil);
      return Promise.resolve(lastEvents.concat(event));
    }, Promise.resolve([]));

    expect(fetch).toHaveBeenCalledTimes(10);
    events.forEach((event, index) => {
      expect(event.waitUntil).toHaveBeenCalledTimes(index >= 5 ? 4 : 3);
      expect(event.respondWith).toHaveBeenCalledTimes(1);
      expect(event.respondWith).toHaveBeenCalledWith(Promise.resolve(event.response));
    });
  });

  test('caches a module and writes meta record', async () => {
    expect.assertions(6);

    const middleware = createCachingMiddleware();

    const url = 'https://example.com/cdn/test-root/2.2.2/test-root.browser.js';
    const event = createFetchEvent(url);
    fetch.mockImplementationOnce(() => Promise.resolve(event.response));

    middleware(event);

    await waitFor(event.respondWith);
    await waitFor(event.waitUntil);

    expect(event.waitUntil).toHaveBeenCalledTimes(3);
    expect(event.respondWith).toHaveBeenCalledTimes(1);
    expect(event.respondWith).toHaveBeenCalledWith(Promise.resolve(event.response));

    const cachesSnapShot = caches.snapshot();
    const expirationMeta = JSON.parse(cachesSnapShot['__sw/__meta']['http://localhost/__sw/__meta/one-cache'].body.parts.join(''));
    const moduleMeta = JSON.parse(cachesSnapShot['__sw/__meta']['http://localhost/__sw/__meta/__sw/module-cache'].body.parts.join(''));

    expect(expirationMeta).toEqual({
      'https://example.com/cdn/test-root/2.2.2/test-root.browser.js': { expires: expect.any(Number) },
    });
    expect(moduleMeta).toEqual({
      'http://localhost/module/test-root': {
        name: 'test-root',
        version: '2.2.2',
        resource: 'test-root',
        bundle: 'browser',
        type: 'module',
        url,
      },
    });
    const {
      clone, json, text, ...eventResponse
    } = event.response;
    expect(cachesSnapShot['__sw/module-cache'][url]).toEqual(eventResponse);
  });

  test('caches a module and responds from the cache if available', async () => {
    expect.assertions(7);

    const middleware = createCachingMiddleware();

    const events = await [
      'https://example.com/cdn/test-root/2.2.2/test-root.browser.js',
      'https://example.com/cdn/test-root/2.2.2/test-root.browser.js',
    ].reduce(async (lastPromises, url, index) => {
      const lastEvents = await lastPromises;
      const event = createFetchEvent(url);
      if (index < 1) {
        fetch.mockImplementationOnce(() => Promise.resolve(event.response));
      }
      middleware(event);
      await waitFor(event.respondWith);
      await waitFor(event.waitUntil);
      return Promise.resolve(lastEvents.concat(event));
    }, Promise.resolve([]));

    expect(fetch).toHaveBeenCalledTimes(1);
    events.forEach((event, index) => {
      if (index < 1) {
        expect(event.waitUntil).toHaveBeenCalledTimes(3);
      } else {
        expect(event.waitUntil).toHaveBeenCalledTimes(2);
      }
      expect(event.respondWith).toHaveBeenCalledTimes(1);
      expect(event.respondWith).toHaveBeenCalledWith(Promise.resolve(event.response));
    });
  });

  test('caches a module and any chunks of that module', async () => {
    expect.assertions(7);

    const middleware = createCachingMiddleware();

    const events = await [
      'https://example.com/cdn/test-root/2.2.2/test-root.browser.js',
      'https://example.com/cdn/test-root/2.2.2/TestChunk.test-root.chunk.browser.js',
    ].reduce(async (lastPromises, url) => {
      const lastEvents = await lastPromises;
      const event = createFetchEvent(url);
      fetch.mockImplementationOnce(() => Promise.resolve(event.response));
      middleware(event);
      await waitFor(event.respondWith);
      await waitFor(event.waitUntil);
      return Promise.resolve(lastEvents.concat(event));
    }, Promise.resolve([]));

    expect(fetch).toHaveBeenCalledTimes(2);
    events.forEach((event) => {
      expect(event.waitUntil).toHaveBeenCalledTimes(3);
      expect(event.respondWith).toHaveBeenCalledTimes(1);
      expect(event.respondWith).toHaveBeenCalledWith(Promise.resolve(event.response));
    });
  });

  test('caches only one language pack per module', async () => {
    expect.assertions(10);

    const middleware = createCachingMiddleware();

    const events = await [
      'https://example.com/cdn/test-root/2.2.2/test-root.browser.js',
      'https://example.com/cdn/test-root/2.2.2/locale/en-US/test-root.json',
      'https://example.com/cdn/test-root/2.2.2/locale/en-CA/test-root.json',
    ].reduce(async (lastPromises, url) => {
      const lastEvents = await lastPromises;
      const event = createFetchEvent(url);
      fetch.mockImplementationOnce(() => Promise.resolve(event.response));
      middleware(event);
      await waitFor(event.respondWith);
      await waitFor(event.waitUntil);
      return Promise.resolve(lastEvents.concat(event));
    }, Promise.resolve([]));

    expect(fetch).toHaveBeenCalledTimes(3);
    events.forEach((event) => {
      expect(event.waitUntil).toHaveBeenCalledTimes(3);
      expect(event.respondWith).toHaveBeenCalledTimes(1);
      expect(event.respondWith).toHaveBeenCalledWith(Promise.resolve(event.response));
    });
  });

  test('caches modules and lang-packs without conflicting', async () => {
    expect.assertions(13);

    const middleware = createCachingMiddleware();

    const events = await [
      'https://example.com/cdn/test-root/2.2.2/test-root.browser.js',
      'https://example.com/cdn/test-root/2.2.2/locale/en-US/test-root.json',
      'https://example.com/cdn/test-module/4.3.2/test-module.browser.js',
      'https://example.com/cdn/test-module/4.3.2/locale/en-US/test-module.json',
    ].reduce(async (lastPromises, url) => {
      const lastEvents = await lastPromises;
      const event = createFetchEvent(url);
      fetch.mockImplementationOnce(() => Promise.resolve(event.response));
      middleware(event);
      await waitFor(event.respondWith);
      await waitFor(event.waitUntil);
      return Promise.resolve(lastEvents.concat(event));
    }, Promise.resolve([]));

    expect(fetch).toHaveBeenCalledTimes(4);
    events.forEach((event) => {
      expect(event.waitUntil).toHaveBeenCalledTimes(3);
      expect(event.respondWith).toHaveBeenCalledTimes(1);
      expect(event.respondWith).toHaveBeenCalledWith(Promise.resolve(event.response));
    });
  });

  test('caches a module while removing an older version and updates meta record', async () => {
    expect.assertions(12);

    const middleware = createCachingMiddleware();

    const url = 'https://example.com/cdn/test-root/2.2.1/test-root.browser.js';
    const event = createFetchEvent(url);
    fetch.mockImplementationOnce(() => Promise.resolve(event.response));
    middleware(event);
    await waitFor(event.respondWith);
    await waitFor(event.waitUntil);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(event.waitUntil).toHaveBeenCalledTimes(3);
    expect(event.respondWith).toHaveBeenCalledTimes(1);
    expect(event.respondWith).toHaveBeenCalledWith(Promise.resolve(event.response));

    // a second response with a differing module version

    const nextUrl = 'https://example.com/cdn/test-root/2.2.2/test-root.browser.js';
    const nextEvent = createFetchEvent(nextUrl);
    fetch.mockImplementationOnce(() => Promise.resolve(nextEvent.response));
    middleware(nextEvent);
    await waitFor(nextEvent.respondWith);
    await waitFor(nextEvent.waitUntil);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(nextEvent.waitUntil).toHaveBeenCalledTimes(4);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(nextEvent.respondWith).toHaveBeenCalledTimes(1);
    expect(nextEvent.respondWith).toHaveBeenCalledWith(Promise.resolve(nextEvent.response));

    const cachesSnapShot = caches.snapshot();
    const moduleMeta = JSON.parse(cachesSnapShot['__sw/__meta']['http://localhost/__sw/__meta/__sw/module-cache'].body.parts.join(''));

    expect(moduleMeta).toEqual({
      'http://localhost/module/test-root': {
        name: 'test-root',
        version: '2.2.2',
        resource: 'test-root',
        bundle: 'browser',
        type: 'module',
        url: nextUrl,
      },
    });
    const {
      clone, json, text, ...eventResponse
    } = nextEvent.response;
    expect(cachesSnapShot['__sw/module-cache'][nextUrl]).toEqual(eventResponse);
    expect(cachesSnapShot['__sw/module-cache'][url]).toBeUndefined();
  });

  test('caches a modern module and removes it\'s initial legacy counterpart', async () => {
    expect.assertions(10);

    const middleware = createCachingMiddleware();

    const url = 'https://example.com/cdn/test-root/2.2.2/test-root.legacy.browser.js';
    const event = createFetchEvent(url);
    fetch.mockImplementationOnce(() => Promise.resolve(event.response));
    middleware(event);
    await waitFor(event.respondWith);
    await waitFor(event.waitUntil);
    expect(event.waitUntil).toHaveBeenCalledTimes(3);
    expect(event.respondWith).toHaveBeenCalledTimes(1);
    expect(event.respondWith).toHaveBeenCalledWith(Promise.resolve(event.response));

    // a second response with a differing clientCacheRevision key

    const nextUrl = 'https://example.com/cdn/test-root/2.2.2/test-root.browser.js';
    const nextEvent = createFetchEvent(nextUrl);
    fetch.mockImplementationOnce(() => Promise.resolve(nextEvent.response));
    middleware(nextEvent);
    await waitFor(nextEvent.respondWith);
    await waitFor(nextEvent.waitUntil);
    expect(nextEvent.waitUntil).toHaveBeenCalledTimes(4);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(nextEvent.respondWith).toHaveBeenCalledTimes(1);
    expect(nextEvent.respondWith).toHaveBeenCalledWith(Promise.resolve(nextEvent.response));

    const cachesSnapShot = caches.snapshot();
    const moduleMeta = JSON.parse(cachesSnapShot['__sw/__meta']['http://localhost/__sw/__meta/__sw/module-cache'].body.parts.join(''));

    expect(moduleMeta).toEqual({
      'http://localhost/module/test-root': {
        name: 'test-root',
        version: '2.2.2',
        resource: 'test-root',
        bundle: 'browser',
        type: 'module',
        url: nextUrl,
      },
    });
    const {
      clone, json, text, ...eventResponse
    } = nextEvent.response;
    expect(cachesSnapShot['__sw/module-cache'][nextUrl]).toEqual(eventResponse);
    expect(cachesSnapShot['__sw/module-cache'][url]).toBeUndefined();
  });

  test('caches a module and invalidates with differing `clientCacheRevision` key', async () => {
    expect.assertions(10);

    const middleware = createCachingMiddleware();

    const url = 'https://example.com/cdn/test-root/2.2.2/test-root.browser.js?clientCacheRevision=abc';
    const event = createFetchEvent(url);
    fetch.mockImplementationOnce(() => Promise.resolve(event.response));
    middleware(event);
    await waitFor(event.respondWith);
    await waitFor(event.waitUntil);
    expect(event.waitUntil).toHaveBeenCalledTimes(3);
    expect(event.respondWith).toHaveBeenCalledTimes(1);
    expect(event.respondWith).toHaveBeenCalledWith(Promise.resolve(event.response));

    // a second response with a differing clientCacheRevision key

    const nextUrl = 'https://example.com/cdn/test-root/2.2.2/test-root.browser.js?clientCacheRevision=def';
    const nextEvent = createFetchEvent(nextUrl);
    fetch.mockImplementationOnce(() => Promise.resolve(nextEvent.response));
    middleware(nextEvent);
    await waitFor(nextEvent.respondWith);
    await waitFor(nextEvent.waitUntil);
    expect(nextEvent.waitUntil).toHaveBeenCalledTimes(4);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(nextEvent.respondWith).toHaveBeenCalledTimes(1);
    expect(nextEvent.respondWith).toHaveBeenCalledWith(Promise.resolve(nextEvent.response));

    const cachesSnapShot = caches.snapshot();
    const moduleMeta = JSON.parse(cachesSnapShot['__sw/__meta']['http://localhost/__sw/__meta/__sw/module-cache'].body.parts.join(''));

    expect(moduleMeta).toEqual({
      'http://localhost/module/test-root': {
        name: 'test-root',
        version: '2.2.2',
        resource: 'test-root',
        revision: 'def',
        bundle: 'browser',
        type: 'module',
        url: nextUrl,
      },
    });
    const {
      clone, json, text, ...eventResponse
    } = nextEvent.response;
    expect(cachesSnapShot['__sw/module-cache'][nextUrl]).toEqual(eventResponse);
    expect(cachesSnapShot['__sw/module-cache'][url]).toBeUndefined();
  });
});
