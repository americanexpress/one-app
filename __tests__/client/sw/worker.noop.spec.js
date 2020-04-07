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

import EventTarget from 'service-worker-mock/models/EventTarget';
import createServiceWorkerMocks from 'service-worker-mock';

function loadServiceWorker() {
  jest.isolateModules(() => {
    require('../../../src/client/sw/worker.noop');
  });
}

describe('worker noop', () => {
  beforeEach(() => {
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
      })
    );
  });

  test('adds listeners', () => {
    expect.assertions(5);

    loadServiceWorker();

    expect(self.listeners.size).toEqual(2);
    expect(self.listeners.has('install')).toBeDefined();
    expect(self.listeners.has('activate')).toBeDefined();
    expect(self.listeners.get('install').size).toEqual(1);
    expect(self.listeners.get('activate').size).toEqual(1);
  });

  test('calls skipWaiting on "install"', () => {
    expect.assertions(1);

    jest.spyOn(global, 'skipWaiting');

    loadServiceWorker();

    self.listeners.get('install').forEach((handler) => handler());

    expect(self.skipWaiting).toHaveBeenCalledTimes(1);
  });

  test('navigates all active window clients on "activate"', async () => {
    expect.assertions(6);

    const waitUntil = jest.fn();
    const clientUrl = 'https://pwa.example.com';
    const windowClient = await self.clients.openWindow(clientUrl);
    jest.spyOn(windowClient, 'navigate');
    jest.spyOn(global.clients, 'matchAll');

    loadServiceWorker();

    self.listeners.get('activate').forEach((handler) => handler({
      waitUntil,
    }));

    await waitUntil.mock.calls[0][0];

    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(self.clients.matchAll).toHaveBeenCalledTimes(1);
    expect(self.clients.matchAll).toHaveBeenCalledWith({ type: 'window' });
    expect(self.clients.matchAll).toHaveReturnedWith(Promise.resolve([windowClient]));
    expect(windowClient.navigate).toHaveBeenCalledTimes(1);
    expect(windowClient.navigate).toHaveBeenCalledWith(clientUrl);
  });
});
