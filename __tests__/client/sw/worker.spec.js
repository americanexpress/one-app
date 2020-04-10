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
} from '../../../src/client/sw/middleware';

jest.mock('@americanexpress/one-service-worker');

function loadServiceWorker() {
  jest.isolateModules(() => {
    require('../../../src/client/sw/worker');
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('service worker script', () => {
  beforeAll(() => {
    jest.spyOn(console, 'error');
    console.error.mockImplementation();
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

    expect(loadServiceWorker).not.toThrow(failureError);

    expect(on).toHaveBeenCalledTimes(1);
    expect(self.unregister).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(failureError);
  });
});
