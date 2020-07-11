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
  expiration, cacheRouter, appShell, match,
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

function createFetchEvent(url = '/index.html') {
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
    } else if (initEvent !== null) {
      fetch.mockImplementationOnce(() => Promise.resolve(event.response));
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
  target.fetch = jest.fn(() => Promise.resolve({
    json: jest.fn(() => Promise.resolve()),
    text: jest.fn(() => Promise.resolve()),
    // eslint-disable-next-line no-restricted-globals
    clone: jest.fn(new Response(null, { url: self.location })),
  }));
}

describe('createFetchMiddleware', () => {
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
        fetch.mockImplementationOnce(() => Promise.resolve(event.response));
      });

      expect(fetch).toHaveBeenCalledTimes(0);
      events.forEach((event) => {
        expect(event.respondWith).toHaveBeenCalledTimes(1);
      });
    });
  });
});
