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

import { on, register, match } from '@americanexpress/one-service-worker';

import serviceWorkerClient from '../../../src/client/service-worker/client';

jest.mock('@americanexpress/one-service-worker', () => ({
  messageContext: jest.fn(),
  messenger: jest.fn(),
  on: jest.fn(),
  register: jest.fn(() => Promise.resolve()),
  // made synchronous to aid testing
  match: jest.fn(() => ({ then: jest.fn((cb) => cb()) })),
  createCacheName: jest.fn((str) => str),
}));

beforeEach(() => {
  global.fetch = jest.fn();
  jest.clearAllMocks();
});

describe('serviceWorkerClient', () => {
  test('it calls register and listens for messages and registration', async () => {
    expect.assertions(4);
    const scriptUrl = '/_/pwa/sw.js';
    const scope = '/';

    await expect(serviceWorkerClient({ scope, scriptUrl })).resolves.toBeUndefined();
    expect(on).toHaveBeenCalledTimes(2);
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(scriptUrl, { scope });
  });

  test('preps the offline cache and fetches if missing', async () => {
    expect.assertions(7);
    const scriptUrl = '/_/pwa/sw.js';
    const webManifestUrl = '/_/pwa/manifest.webmanifest';
    const offlineUrl = '/_/pwa/shell';
    const scope = '/';

    await expect(serviceWorkerClient({
      scope, scriptUrl, webManifestUrl, offlineUrl,
    })).resolves.toBeUndefined();

    // we should expect the cache items to be missing and
    // should call fetch for both resources
    const registerHandle = on.mock.calls[1][1];
    expect(() => registerHandle()).not.toThrow();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledWith(webManifestUrl);
    expect(global.fetch).toHaveBeenCalledWith(offlineUrl);

    match.mockImplementationOnce(() => ({ then: jest.fn((cb) => cb({})) }));
    match.mockImplementationOnce(() => ({ then: jest.fn((cb) => cb({})) }));

    // we should expect the caching mechanism to trigger (via fetch) if
    // the cache items are missing
    expect(() => registerHandle()).not.toThrow();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
