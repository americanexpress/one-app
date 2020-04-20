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

import { importPWAChunk, initializePWA } from '../../../src/client/sw';
import pwaClient from '../../../src/client/sw/client';

jest.mock('../../../src/client/sw/client', () => jest.fn(() => Promise.resolve('pwaClient')));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('importPWAChunk', () => {
  test('imports client and calls with config', async () => {
    expect.assertions(3);

    const pwaConfig = {};
    // we should expect pwaClient to chain the return value of initializePWA
    await expect(importPWAChunk(pwaConfig)).resolves.toEqual('pwaClient');
    expect(pwaClient).toHaveBeenCalledTimes(1);
    expect(pwaClient).toHaveBeenCalledWith(pwaConfig);
  });
});

describe('initializePWA', () => {
  let getRegistration;

  beforeEach(() => {
    getRegistration = jest.fn(() => Promise.resolve());
    navigator.serviceWorker = {
      getRegistration,
    };
  });

  test('does nothing without arguments and resolves to undefined', async () => {
    expect.assertions(2);

    await expect(initializePWA()).resolves.toBeUndefined();
    expect(pwaClient).not.toHaveBeenCalled();
  });

  test('does not call in pwaClient if service worker is not supported', async () => {
    expect.assertions(3);

    delete navigator.serviceWorker;

    await expect(initializePWA()).resolves.toBeUndefined();
    expect(getRegistration).not.toHaveBeenCalled();
    expect(pwaClient).not.toHaveBeenCalled();
  });

  test('does not call in pwaClient if a service worker already exists', async () => {
    expect.assertions(3);

    const registration = {};
    getRegistration.mockImplementationOnce(() => Promise.resolve(registration));

    await expect(initializePWA({ enabled: true })).resolves.toBe(registration);
    expect(getRegistration).toHaveBeenCalledTimes(1);
    expect(pwaClient).not.toHaveBeenCalled();
  });

  test('imports client and calls with config', async () => {
    expect.assertions(4);

    const pwaConfig = { enabled: true };

    await expect(initializePWA(pwaConfig)).resolves.toEqual('pwaClient');
    expect(getRegistration).toHaveBeenCalledTimes(1);
    expect(pwaClient).toHaveBeenCalledTimes(1);
    expect(pwaClient).toHaveBeenCalledWith(pwaConfig);
  });
});
