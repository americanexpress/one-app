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
    serviceWorkerClient.mockImplementation(() => Promise.resolve(registration));
  });

  test('does not call in serviceWorkerClient if service worker is not supported', async () => {
    expect.assertions(3);

    delete navigator.serviceWorker;

    await expect(initializeServiceWorker({ getState })).resolves.toBeUndefined();
    expect(getRegistration).not.toHaveBeenCalled();
    expect(serviceWorkerClient).not.toHaveBeenCalled();
  });

  test('when serviceWorker is disabled, returns null if registration is not present', async () => {
    expect.assertions(2);

    getRegistration.mockImplementationOnce(() => Promise.resolve());
    getState.mockImplementationOnce(() => fromJS({ config: { serviceWorker: false } }));

    await expect(initializeServiceWorker({ getState })).resolves.toBe(null);
    expect(serviceWorkerClient).not.toHaveBeenCalled();
  });

  test('when serviceWorker is disabled, returns registration and unregisters the service worker', async () => {
    expect.assertions(3);

    getState.mockImplementationOnce(() => fromJS({ config: { serviceWorker: false } }));

    await expect(initializeServiceWorker({ getState })).resolves.toBe(registration);
    expect(registration.unregister).toHaveBeenCalledTimes(1);
    expect(serviceWorkerClient).not.toHaveBeenCalled();
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

    await expect(initializeServiceWorker({ getState })).resolves.toBe(null);
    expect(serviceWorkerClient).not.toHaveBeenCalled();
  });

  test('when recoveryMode is active, returns registration and updates the service worker', async () => {
    expect.assertions(3);

    getState.mockImplementationOnce(() => fromJS({
      config: {
        serviceWorker: true,
        serviceWorkerRecoveryMode: true,
      },
    }));

    await expect(initializeServiceWorker({ getState })).resolves.toBe(registration);
    expect(registration.update).toHaveBeenCalledTimes(1);
    expect(serviceWorkerClient).not.toHaveBeenCalled();
  });

  test('calls serviceWorkerClient with settings if a service worker registration does not exist', async () => {
    expect.assertions(4);

    getRegistration.mockImplementationOnce(() => Promise.resolve());

    await expect(initializeServiceWorker({ getState })).resolves.toBe(registration);
    expect(getRegistration).toHaveBeenCalledTimes(1);
    expect(serviceWorkerClient).toHaveBeenCalledTimes(1);
    expect(serviceWorkerClient).toHaveBeenCalledWith({
      scriptUrl,
      scope,
      onError: expect.any(Function),
    });
  });

  test('calls serviceWorkerClient with settings if the registration is present', async () => {
    expect.assertions(4);

    await expect(initializeServiceWorker({ getState })).resolves.toBe(registration);
    expect(getRegistration).toHaveBeenCalledTimes(1);
    expect(serviceWorkerClient).toHaveBeenCalledTimes(1);
    expect(serviceWorkerClient).toHaveBeenCalledWith({
      scriptUrl,
      scope,
      onError: expect.any(Function),
    });
  });

  test('calls serviceWorkerClient with settings and simulates when an error occurs', async () => {
    expect.assertions(5);

    const dispatch = jest.fn();
    await expect(initializeServiceWorker({ getState, dispatch })).resolves.toBe(registration);
    expect(serviceWorkerClient).toHaveBeenCalledWith({
      scriptUrl,
      scope,
      onError: expect.any(Function),
    });

    // we make sure any error calls dispatch with addErrorToReport

    const error = new Error('ooops');
    const { onError } = serviceWorkerClient.mock.calls[0][0];
    expect(onError(error)).toBeUndefined();
    expect(dispatch).toHaveBeenCalledTimes(1);

    // to make sure our error action object is reachable, we invoke it thunk-like
    dispatch.mock.calls[0][0](dispatch);
    expect(dispatch).toHaveBeenCalledWith({
      error,
      otherData: undefined,
      type: '@americanexpress/one-app-ducks/error-reporting/ADD_ERROR_REPORT_TO_QUEUE',
    });
  });
});
