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

/* eslint-disable no-restricted-globals */

import { on } from '@americanexpress/one-service-worker';
import {
  createInstallMiddleware,
  createActivateMiddleware,
  createFetchMiddleware,
} from '../../../src/client/sw/middleware';

jest.mock('@americanexpress/one-service-worker');
jest.mock('../../../src/client/sw/middleware/invalidation');

function loadServiceWorker() {
  jest.isolateModules(() => {
    require('../../../src/client/sw/worker');
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('service worker script', () => {
  let error;

  beforeAll(() => {
    ({ error } = console);
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = error;
  });

  test('calls "on" with lifecycle and fetch middleware', () => {
    expect.assertions(4);

    loadServiceWorker();

    expect(on).toHaveBeenCalledTimes(3);
    expect(on).toHaveBeenCalledWith('install', createInstallMiddleware());
    expect(on).toHaveBeenCalledWith('activate', createActivateMiddleware());
    expect(on).toHaveBeenCalledWith('fetch', createFetchMiddleware());
  });

  test('catches error during initialization, logs the error and unregisters the service worker', () => {
    expect.assertions(5);

    self.unregister = jest.fn();
    const failureError = new Error('failure');
    on.mockImplementationOnce(() => {
      throw failureError;
    });

    expect(loadServiceWorker).not.toThrow(failureError);

    expect(on).toHaveBeenCalledTimes(1);
    expect(self.unregister).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(failureError);
  });
});

function loadServiceWorkerMock() {
  const createServiceWorkerMocks = require('service-worker-mock');
  const EventTarget = require('service-worker-mock/models/EventTarget');

  Object.assign(
    global,
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
      emit(type, event = {}) {
        if (this.listeners.has(type)) {
          this.listeners.get(type).forEach((listener) => listener(event));
        }
      },
    }
  );
}

describe('with service worker', () => {
  beforeAll(() => {
    jest.dontMock('../../../src/client/sw/middleware/invalidation');
    jest.doMock('@americanexpress/one-service-worker', () => {
      const osw = jest.requireActual('@americanexpress/one-service-worker');
      Object.keys(osw).forEach((key) => typeof osw[key] === 'function' && jest.spyOn(osw, key));
      return osw;
    });
  });

  let osw;

  beforeEach(() => {
    jest.resetModules();

    loadServiceWorkerMock();

    jest.spyOn(self, 'skipWaiting');
    jest.spyOn(self.clients, 'claim');

    osw = require('@americanexpress/one-service-worker');
  });

  test('calls "on" with lifecycle and fetch middleware', () => {
    expect.assertions(4);

    loadServiceWorker();

    expect(osw.on).toHaveBeenCalledTimes(3);
    expect(osw.on).toHaveBeenCalledWith('install', expect.anything());
    expect(osw.on).toHaveBeenCalledWith('activate', expect.anything());
    expect(osw.on).toHaveBeenCalledWith('fetch', expect.anything());
  });

  describe('lifecycle', () => {
    beforeEach(loadServiceWorker);

    test('install event calls self.skipWaiting', async () => {
      expect.assertions(2);

      const waitUntil = jest.fn();
      self.emit('install', { waitUntil });

      expect(osw.skipWaiting).toHaveBeenCalledTimes(1);
      expect(self.skipWaiting).toHaveBeenCalledTimes(1);
    });

    test('activate event calls self.clients.claim', async () => {
      expect.assertions(2);

      const waitUntil = jest.fn();
      self.emit('activate', { waitUntil });

      expect(osw.clientsClaim).toHaveBeenCalledTimes(1);
      expect(self.clients.claim).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetch', () => {
    const config = { buildVersion: '5.0.0' };

    beforeAll(() => {
      process.env.OSW_CONFIG = JSON.stringify(config);
    });

    test('activate event calls self.clients.claim', async () => {
      expect.assertions(2);

      loadServiceWorker();

      const waitUntil = jest.fn();
      self.emit('activate', { waitUntil });

      expect(osw.cacheRouter).toHaveBeenCalledTimes(3);
      expect(osw.expiration).toHaveBeenCalledTimes(1);
    });
  });
});
