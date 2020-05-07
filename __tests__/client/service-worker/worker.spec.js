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

import EventTarget from 'service-worker-mock/models/EventTarget';
import createServiceWorkerMocks from 'service-worker-mock';

import {
  createInstallMiddleware,
  createActivateMiddleware,
} from '../../../src/client/service-worker/events';
import { ERROR_MESSAGE_ID_KEY } from '../../../src/client/service-worker/constants';

jest.mock('@americanexpress/one-service-worker');

function loadServiceWorker() {
  jest.isolateModules(() => {
    require('../../../src/client/service-worker/worker');
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('service worker script', () => {
  beforeAll(() => {
    self.postMessage = jest.fn();
  });

  test('calls "on" with lifecycle middleware', () => {
    expect.assertions(3);

    loadServiceWorker();

    expect(on).toHaveBeenCalledTimes(2);
    expect(on).toHaveBeenCalledWith('install', createInstallMiddleware());
    expect(on).toHaveBeenCalledWith('activate', createActivateMiddleware());
  });

  test('catches error during initialization, logs the error and unregisters the service worker', () => {
    expect.assertions(5);

    self.unregister = jest.fn();
    const failureError = new Error('failure');
    on.mockImplementationOnce(() => {
      throw failureError;
    });

    expect(loadServiceWorker).not.toThrow();

    expect(on).toHaveBeenCalledTimes(1);
    expect(self.unregister).toHaveBeenCalledTimes(1);
    expect(self.postMessage).toHaveBeenCalledTimes(1);
    expect(self.postMessage).toHaveBeenCalledWith({
      id: ERROR_MESSAGE_ID_KEY,
      error: failureError,
    });
  });
});

describe('service worker behavior', () => {
  beforeAll(() => {
    jest.doMock('@americanexpress/one-service-worker', () => {
      const osw = jest.requireActual('@americanexpress/one-service-worker');
      Object.keys(osw).forEach((key) => {
        if (typeof osw[key] === 'function') jest.spyOn(osw, key);
      });
      return osw;
    });
  });

  beforeEach(() => {
    jest.resetModules();

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
      }
    );
  });

  test('calls skipWaiting on "install"', async () => {
    expect.assertions(2);

    const waitUntil = jest.fn();
    jest.spyOn(global, 'skipWaiting');

    loadServiceWorker();

    self.listeners.get('install').forEach((handler) => handler({
      waitUntil,
    }));

    await waitUntil.mock.calls[0][0];

    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(self.skipWaiting).toHaveBeenCalledTimes(1);
  });

  test('calls clients.claim on "activate"', async () => {
    expect.assertions(2);

    const waitUntil = jest.fn();
    jest.spyOn(global.clients, 'claim');

    loadServiceWorker();

    self.listeners.get('activate').forEach((handler) => handler({
      waitUntil,
    }));

    await waitUntil.mock.calls[0][0];

    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(self.clients.claim).toHaveBeenCalledTimes(1);
  });
});
