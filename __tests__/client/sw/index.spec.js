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

import { fromJS } from 'immutable';
import { importPWAClient, initializePWA } from '../../../src/client/sw';
import pwaClient from '../../../src/client/sw/client';

jest.mock('../../../src/client/sw/client', () => jest.fn(() => Promise.resolve('pwaClient')));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('importPWAClient', () => {
  test('imports client and calls with config', async () => {
    expect.assertions(3);

    const pwaConfig = {};
    // we should expect pwaClient to chain the return value of initializePWA
    await expect(importPWAClient(pwaConfig)).resolves.toEqual('pwaClient');
    expect(pwaClient).toHaveBeenCalledTimes(1);
    expect(pwaClient).toHaveBeenCalledWith(pwaConfig);
  });
});

describe('initializePWA', () => {
  let registration;
  let getRegistration;

  const scope = '/';
  const scriptUrl = '/_/pwa/service-worker.js';
  const getState = jest.fn(() => fromJS({
    config: {
      serviceWorker: true,
      serviceWorkerRecoveryMode: false,
      serviceWorkerScriptUrl: scriptUrl,
      serviceWorkerScope: scope,
    },
  }));

  beforeEach(() => {
    registration = {
      update: jest.fn(() => Promise.resolve()),
      unregister: jest.fn(() => Promise.resolve()),
    };
    getRegistration = jest.fn(() => Promise.resolve(registration));
    navigator.serviceWorker = {
      getRegistration,
    };
    pwaClient.mockImplementation(() => Promise.resolve(registration));
  });

  test('does not call in pwaClient if service worker is not supported', async () => {
    expect.assertions(3);

    delete navigator.serviceWorker;

    await expect(initializePWA({ getState })).resolves.toBeUndefined();
    expect(getRegistration).not.toHaveBeenCalled();
    expect(pwaClient).not.toHaveBeenCalled();
  });

  test('when serviceWorker is disabled, returns null if registration is not present', async () => {
    expect.assertions(2);

    getRegistration.mockImplementationOnce(() => Promise.resolve());
    getState.mockImplementationOnce(() => fromJS({ config: { serviceWorker: false } }));

    await expect(initializePWA({ getState })).resolves.toBe(null);
    expect(pwaClient).not.toHaveBeenCalled();
  });

  test('when serviceWorker is disabled, returns registration and unregisters the service worker', async () => {
    expect.assertions(3);

    getState.mockImplementationOnce(() => fromJS({ config: { serviceWorker: false } }));

    await expect(initializePWA({ getState })).resolves.toBe(registration);
    expect(registration.unregister).toHaveBeenCalledTimes(1);
    expect(pwaClient).not.toHaveBeenCalled();
  });

  test('when recoveryMode is active, returns null if registration is not present', async () => {
    expect.assertions(2);

    getRegistration.mockImplementationOnce(() => Promise.resolve());
    getState.mockImplementationOnce(() => fromJS({
      config: {
        serviceWorker: true,
        serviceWorkerRecoveryMode: true,
      },
    }));

    await expect(initializePWA({ getState })).resolves.toBe(null);
    expect(pwaClient).not.toHaveBeenCalled();
  });

  test('when recoveryMode is active, returns registration and updates the service worker', async () => {
    expect.assertions(3);

    getState.mockImplementationOnce(() => fromJS({
      config: {
        serviceWorker: true,
        serviceWorkerRecoveryMode: true,
      },
    }));

    await expect(initializePWA({ getState })).resolves.toBe(registration);
    expect(registration.update).toHaveBeenCalledTimes(1);
    expect(pwaClient).not.toHaveBeenCalled();
  });

  test('calls pwaClient with settings if a service worker registration does not exist', async () => {
    expect.assertions(4);

    getRegistration.mockImplementationOnce(() => Promise.resolve());

    await expect(initializePWA({ getState })).resolves.toBe(registration);
    expect(getRegistration).toHaveBeenCalledTimes(1);
    expect(pwaClient).toHaveBeenCalledTimes(1);
    expect(pwaClient).toHaveBeenCalledWith({
      scriptUrl,
      scope,
      onError: expect.any(Function),
    });
  });

  test('calls pwaClient with settings if the registration is present', async () => {
    expect.assertions(4);

    await expect(initializePWA({ getState })).resolves.toBe(registration);
    expect(getRegistration).toHaveBeenCalledTimes(1);
    expect(pwaClient).toHaveBeenCalledTimes(1);
    expect(pwaClient).toHaveBeenCalledWith({
      scriptUrl,
      scope,
      onError: expect.any(Function),
    });
  });

  test('calls pwaClient with settings and simulates when an error occurs', async () => {
    expect.assertions(4);

    const dispatch = jest.fn();
    await expect(initializePWA({ getState, dispatch })).resolves.toBe(registration);
    expect(pwaClient).toHaveBeenCalledWith({
      scriptUrl,
      scope,
      onError: expect.any(Function),
    });

    // we make sure any error calls dispatch with addErrorToReport

    const error = new Error('ooops');
    const { onError } = pwaClient.mock.calls[0][0];
    expect(onError(error)).toBeUndefined();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
