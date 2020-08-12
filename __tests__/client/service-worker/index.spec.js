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

import CacheStorage from 'service-worker-mock/models/CacheStorage';
import Request from 'service-worker-mock/models/Request';

import { importServiceWorkerClient, initializeServiceWorker } from '../../../src/client/service-worker';
import serviceWorkerClient from '../../../src/client/service-worker/client';

jest.mock('../../../src/client/service-worker/client', () => jest.fn(() => Promise.resolve('serviceWorkerClient')));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('importServiceWorkerClient', () => {
  test('imports client and calls with config', async () => {
    expect.assertions(3);

    const pwaConfig = {};
    // we should expect serviceWorkerClient to chain the return value of initializeServiceWorker
    await expect(importServiceWorkerClient(pwaConfig)).resolves.toEqual('serviceWorkerClient');
    expect(serviceWorkerClient).toHaveBeenCalledTimes(1);
    expect(serviceWorkerClient).toHaveBeenCalledWith(pwaConfig);
  });
});

describe('initializeServiceWorker', () => {
  let registration;
  let getRegistration;

  const onError = jest.fn();
  const scope = '/';
  const scriptUrl = '/_/pwa/service-worker.js';

  beforeEach(() => {
    window.Request = Request;
    window.caches = new CacheStorage();

    registration = {
      update: jest.fn(() => Promise.resolve()),
      unregister: jest.fn(() => Promise.resolve()),
    };
    getRegistration = jest.fn(() => Promise.resolve(registration));
    navigator.serviceWorker = {
      getRegistration,
    };
    serviceWorkerClient.mockImplementation(() => Promise.resolve(registration));
  });

  test('does not call in serviceWorkerClient if service worker is not supported', async () => {
    expect.assertions(3);

    delete navigator.serviceWorker;

    await expect(initializeServiceWorker({
      serviceWorker: true,
    })).resolves.toBeUndefined();
    expect(getRegistration).not.toHaveBeenCalled();
    expect(serviceWorkerClient).not.toHaveBeenCalled();
  });

  test('when serviceWorker is disabled, returns null if registration is not present', async () => {
    expect.assertions(2);

    getRegistration.mockImplementationOnce(() => Promise.resolve());

    await expect(initializeServiceWorker({ serviceWorker: false })).resolves.toBe(null);
    expect(serviceWorkerClient).not.toHaveBeenCalled();
  });

  test('when serviceWorker is disabled, returns registration and unregisters the service worker', async () => {
    expect.assertions(3);

    await expect(initializeServiceWorker({ serviceWorker: false })).resolves.toBe(registration);
    expect(registration.unregister).toHaveBeenCalledTimes(1);
    expect(serviceWorkerClient).not.toHaveBeenCalled();
  });

  test('when serviceWorker is disabled, clears the cache of any entries', async () => {
    expect.assertions(5);

    await (await caches.open('__sw/one-app-test')).put(new Request('/app.js'), null);

    expect(caches.snapshot()).toEqual({
      '__sw/one-app-test': {
        'http://localhost/app.js': null,
      },
    });
    await expect(initializeServiceWorker({ serviceWorker: false })).resolves.toBe(registration);
    expect(registration.unregister).toHaveBeenCalledTimes(1);
    expect(serviceWorkerClient).not.toHaveBeenCalled();
    expect(caches.snapshot()).toEqual({});
  });

  test('when recoveryMode is active, returns null if registration is not present', async () => {
    expect.assertions(2);

    getRegistration.mockImplementationOnce(() => Promise.resolve());

    await expect(initializeServiceWorker({
      serviceWorker: true,
      recoveryMode: true,
    })).resolves.toBe(null);
    expect(serviceWorkerClient).not.toHaveBeenCalled();
  });

  test('when recoveryMode is active, returns registration and updates the service worker', async () => {
    expect.assertions(3);

    await expect(initializeServiceWorker({
      serviceWorker: true,
      recoveryMode: true,
    })).resolves.toBe(registration);
    expect(registration.update).toHaveBeenCalledTimes(1);
    expect(serviceWorkerClient).not.toHaveBeenCalled();
  });

  test('when recoveryMode is active, clears the cache of any entries', async () => {
    expect.assertions(5);

    await (await caches.open('__sw/one-app-test')).put(new Request('/shell.html'), null);
    await (await caches.open('__sw/one-app-test')).put(new Request('/app.js'), null);
    await (await caches.open('__sw/other-cache')).put(new Request('/misc.js'), null);

    expect(caches.snapshot()).toEqual({
      '__sw/one-app-test': {
        'http://localhost/shell.html': null,
        'http://localhost/app.js': null,
      },
      '__sw/other-cache': {
        'http://localhost/misc.js': null,
      },
    });
    await expect(initializeServiceWorker({
      serviceWorker: true,
      recoveryMode: true,
    })).resolves.toBe(registration);
    expect(registration.update).toHaveBeenCalledTimes(1);
    expect(serviceWorkerClient).not.toHaveBeenCalled();
    expect(caches.snapshot()).toEqual({});
  });

  test('calls serviceWorkerClient with settings if a service worker registration does not exist', async () => {
    expect.assertions(4);

    getRegistration.mockImplementationOnce(() => Promise.resolve());

    await expect(initializeServiceWorker({
      serviceWorker: true,
      recoveryMode: false,
      scriptUrl,
      scope,
      onError,
    })).resolves.toBe(registration);
    expect(getRegistration).toHaveBeenCalledTimes(1);
    expect(serviceWorkerClient).toHaveBeenCalledTimes(1);
    expect(serviceWorkerClient).toHaveBeenCalledWith({
      scriptUrl,
      scope,
      onError,
    });
  });

  test('calls serviceWorkerClient with settings if the registration is present', async () => {
    expect.assertions(4);

    await expect(initializeServiceWorker({
      serviceWorker: true,
      recoveryMode: false,
      scriptUrl,
      scope,
      onError,
    })).resolves.toBe(registration);
    expect(getRegistration).toHaveBeenCalledTimes(1);
    expect(serviceWorkerClient).toHaveBeenCalledTimes(1);
    expect(serviceWorkerClient).toHaveBeenCalledWith({
      scriptUrl,
      scope,
      onError,
    });
  });
});
