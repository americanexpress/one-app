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
    require('../../../src/client/service-worker/worker.noop');
  });
}

describe('worker noop', () => {
  beforeEach(() => {
    self.postMessage = jest.fn();
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
    expect.assertions(2);

    loadServiceWorker();

    expect(self.listeners.size).toEqual(1);
    expect(self.listeners.get('install').size).toEqual(1);
  });

  test('calls skipWaiting on "install"', () => {
    expect.assertions(1);

    jest.spyOn(global, 'skipWaiting');

    loadServiceWorker();

    self.listeners.get('install').forEach((handler) => handler());

    expect(self.skipWaiting).toHaveBeenCalledTimes(1);
  });
});
