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

import { on, register } from '@americanexpress/one-service-worker';

import serviceWorkerClient from '../../../src/client/service-worker/client';

jest.mock('@americanexpress/one-service-worker', () => ({
  messageContext: jest.fn(),
  messenger: jest.fn(),
  on: jest.fn(),
  register: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('serviceWorkerClient', () => {
  test('it calls register and listens for messages', async () => {
    expect.assertions(4);
    const scriptUrl = '/_/pwa/sw.js';
    const scope = '/';
    await expect(serviceWorkerClient({ scriptUrl, scope })).resolves.toBeUndefined();
    expect(on).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(scriptUrl, { scope });
  });
});
