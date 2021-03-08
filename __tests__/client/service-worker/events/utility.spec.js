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
  match, put, getMetaData, setMetaData, remove,
} from '@americanexpress/one-service-worker';
import Request from 'service-worker-mock/models/Request';
import {
  markResourceForRemoval,
  createResourceMetaData,
  invalidateCacheResource,
  setCacheResource,
  fetchCacheResource,
} from '../../../../src/client/service-worker/events/utility';


jest.mock('@americanexpress/one-service-worker', () => ({
  put: jest.fn(() => Promise.resolve()),
  match: jest.fn(() => Promise.resolve()),
  getMetaData: jest.fn(() => Promise.resolve({})),
  setMetaData: jest.fn(() => Promise.resolve()),
  remove: jest.fn(() => Promise.resolve()),
  createCacheName: jest.fn((passthrough) => ['__sw', passthrough].join('/')),
}));

beforeAll(() => {
  global.fetch = jest.fn(() => Promise.resolve());
  global.Request = Request;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe(markResourceForRemoval.name, () => {
  test('invalidates each matrix of validation', () => {
    const existingMetaData = {
      revision: '101010',
      locale: 'en-US',
      version: '1.0.0',
    };
    const newMetaData = { ...existingMetaData };
    expect(markResourceForRemoval(existingMetaData, newMetaData)).toBe(false);
    [
      // version change, whether up or down, will invalidate
      ['version', '4.5.6'],
      // only a single locale and lang-pack per cache
      ['locale', 'en-CA'],
      // if the clientCacheRevision has changed, we should update
      ['revision', '42'],
      // we are not invalidating for cacheName changes
      ['cacheName', 'change-cache', false],
    ].forEach(([propName, value, result = true]) => {
      // set the value for a given prop name to validate
      newMetaData[propName] = value;
      // run validation and observe expected result
      expect(markResourceForRemoval(existingMetaData, newMetaData)).toBe(result);
      // reset the property to match the existingMetaData
      newMetaData[propName] = existingMetaData[propName];
    });
  });
});

describe(createResourceMetaData.name, () => {
  test.each([
    // app
    [
      'https://example.com/cdn/app/1.2.3-rc.4-abc123/app.js',
      ['app', 'https://example.com/cdn/app/1.2.3-rc.4-abc123/'], {
        type: 'one-app',
        cacheName: '__sw/one-app',
        name: 'app',
        version: '1.2.3-rc.4-abc123',
        path: 'app.js',
      },
    ],
    [
      'https://example.com/cdn/app/1.2.3-rc.4-abc123/i18n/en-US.js',
      ['app', 'https://example.com/cdn/app/1.2.3-rc.4-abc123/'], {
        type: 'one-app',
        cacheName: '__sw/one-app',
        name: 'app',
        version: '1.2.3-rc.4-abc123',
        path: 'i18n/language.js',
        locale: 'en-US',
      },
    ],
    // modules
    [
      'https://example.com/cdn/modules/test-root/2.2.2/test-root.browser.js',
      ['module', 'https://example.com/cdn/modules/test-root/2.2.2/'], {
        type: 'modules',
        name: 'module',
        version: '2.2.2',
        cacheName: '__sw/modules',
        path: 'test-root.browser.js',
      },
    ],
    [
      'https://example.com/cdn/modules/test-root/2.2.2/locale/en-US/test-root.json',
      ['module', 'https://example.com/cdn/modules/test-root/2.2.2/'], {
        name: 'module',
        version: '2.2.2',
        type: 'lang-packs',
        path: 'en-US/test-root.json',
        cacheName: '__sw/lang-packs',
        locale: 'en-US',
      },
    ],
    [
      'https://example.com/cdn/modules/test-root/2.2.2/test-root.browser.js',
      ['module', 'https://example.com/cdn/modules/test-root/2.2.2/'], {
        type: 'modules',
        name: 'module',
        version: '2.2.2',
        cacheName: '__sw/modules',
        path: 'test-root.browser.js',
      },
    ],
    [
      'https://example.com/cdn/modules/test-root/2.2.2/test-root.browser.js',
      ['module', 'https://example.com/cdn/modules/test-root/2.2.2/', '101010'], {
        type: 'modules',
        name: 'module',
        version: '2.2.2',
        cacheName: '__sw/modules',
        path: 'test-root.browser.js',
        revision: '101010',
      },
    ],
  ])('extracts metadata from %s', (url, resourceInfo, result) => {
    // eslint-disable-next-line no-param-reassign
    const meta = createResourceMetaData({ request: { url } }, resourceInfo);
    expect(meta).toEqual({ ...result, url });
  });
});

describe(invalidateCacheResource.name, () => {
  const existingMetaData = {
    cacheName: '__sw/modules',
    name: 'my-module',
    path: 'my-module.browser.js',
    type: 'modules',
    url: 'https://example.com/cdn/modules/my-module/1.0.0/my-module.browser.js',
    version: '1.0.0',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('gets the resource metadata and validates the incoming request', async () => {
    expect.assertions(6);

    const waitUntil = jest.fn();
    const meta = { ...existingMetaData };
    const event = { request: { url: meta.url }, waitUntil };
    const response = {};
    const responseHandler = invalidateCacheResource(event, meta);

    getMetaData.mockImplementationOnce(() => Promise.resolve({}));

    expect(responseHandler(response)).toBe(response);
    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(getMetaData).toHaveBeenCalledTimes(1);
    expect(getMetaData).toHaveBeenCalledWith({ cacheName: 'modules/my-module/my-module.browser.js' });
    await waitUntil.mock.calls[0][0];
    expect(setMetaData).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
  });

  test('invalidates the incoming request due to version change', async () => {
    expect.assertions(7);

    const meta = { ...existingMetaData };
    const newVersion = '1.0.5';
    const newUrl = meta.url.replace(meta.version, newVersion);

    const waitUntil = jest.fn();
    const event = { request: { url: newUrl }, waitUntil };
    const response = {};
    const responseHandler = invalidateCacheResource(event, meta);

    getMetaData.mockImplementationOnce(() => Promise.resolve({ ...meta, version: newVersion }));

    expect(responseHandler(response)).toBe(response);
    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(getMetaData).toHaveBeenCalledTimes(1);
    expect(getMetaData).toHaveBeenCalledWith({ cacheName: 'modules/my-module/my-module.browser.js' });
    await waitUntil.mock.calls[0][0];
    expect(waitUntil).toHaveBeenCalledTimes(2);
    expect(setMetaData).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe(setCacheResource.name, () => {
  const mockMetaData = {
    path: 'my-module.browser.js',
    url: 'https://example.com/cdn/modules/my-module/1.0.0/my-module.browser.js',
    cacheName: '__sw/modules',
  };

  test('calls "put" on the cache with the resource', async () => {
    expect.assertions(5);

    const clone = jest.fn(() => 'clone');
    const waitUntil = jest.fn();
    const meta = { cacheName: mockMetaData.cacheName };
    const event = { request: { url: mockMetaData.url, clone }, waitUntil };
    const response = { clone };
    const responseHandler = setCacheResource(event, meta);

    expect(responseHandler(response)).toBe(response);
    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(clone).toHaveBeenCalledTimes(2);
    expect(put).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledWith('clone', 'clone', meta);
  });
});

describe(fetchCacheResource.name, () => {
  const mockMetaData = {
    path: 'my-module.browser.js',
    url: 'https://example.com/cdn/modules/my-module/1.0.0/my-module.browser.js',
    cacheName: '__sw/modules',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it does not call setCacheResource if response status is not 200', async () => {
    expect.assertions(6);

    const clone = jest.fn(() => 'clone');
    const waitUntil = jest.fn();
    const meta = { ...mockMetaData };
    const event = { request: { url: meta.url, clone }, waitUntil };
    const response = { clone, status: 404 };

    fetch.mockImplementationOnce(() => Promise.resolve(response));

    await expect(fetchCacheResource(event, meta)).resolves.toBe(response);
    expect(clone).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(match).toHaveBeenCalledTimes(1);
    expect(match).toHaveBeenCalledWith('clone', { cacheName: mockMetaData.cacheName });
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  test('calls "match" on the cache falling back to "fetch" and finally runs invalidation', async () => {
    expect.assertions(6);

    const clone = jest.fn(() => 'clone');
    const waitUntil = jest.fn();
    const meta = { ...mockMetaData };
    const event = { request: { url: meta.url, clone }, waitUntil };
    const response = { clone, status: 200 };

    fetch.mockImplementationOnce(() => Promise.resolve(response));

    await expect(fetchCacheResource(event, meta)).resolves.toBe(response);
    expect(clone).toHaveBeenCalledTimes(4);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(match).toHaveBeenCalledTimes(1);
    expect(match).toHaveBeenCalledWith('clone', { cacheName: mockMetaData.cacheName });
    expect(waitUntil).toHaveBeenCalledTimes(2);
  });

  test('calls "match" and responds from the cache', async () => {
    expect.assertions(5);

    const clone = jest.fn(() => 'clone');
    const waitUntil = jest.fn();
    const meta = { ...mockMetaData };
    const event = { request: { url: meta.url, clone }, waitUntil };
    const response = { clone, status: 200 };

    match.mockImplementationOnce(() => Promise.resolve(response));

    await expect(fetchCacheResource(event, meta)).resolves.toBe(response);
    expect(clone).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
    expect(match).toHaveBeenCalledTimes(1);
    expect(match).toHaveBeenCalledWith('clone', { cacheName: mockMetaData.cacheName });
  });
});
