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

import { register, unregister } from '@americanexpress/one-service-worker';

import initializePWA from '../../../src/client/sw/client';

jest.mock('@americanexpress/one-service-worker');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('initializePWA', () => {
  test('it calls register when enabled', async () => {
    expect.assertions(3);
    const scriptUrl = '/_/pwa/sw.js';
    const scope = '/';
    await expect(initializePWA({ enabled: true, scriptUrl, scope })).resolves.toBeUndefined();
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(scriptUrl, { scope });
  });

  test('it calls unregister when disabled', async () => {
    expect.assertions(2);
    await expect(initializePWA({ enabled: false })).resolves.toBeUndefined();
    expect(unregister).toHaveBeenCalledTimes(1);
  });

  test('it calls unregister when no parameters are passed', async () => {
    expect.assertions(2);
    await expect(initializePWA()).resolves.toBeUndefined();
    expect(unregister).toHaveBeenCalledTimes(1);
  });
});
