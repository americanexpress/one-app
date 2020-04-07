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

import pwaClient from '../../../src/client/sw';
import initializePWA from '../../../src/client/sw/client';

jest.mock('../../../src/client/sw/client', () => jest.fn(() => Promise.resolve()));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('pwaClient', () => {
  test('exports a function as default', () => {
    expect.assertions(1);
    expect(pwaClient).toBeInstanceOf(Function);
  });

  test('imports client and calls with config', async () => {
    expect.assertions(3);

    const pwaConfig = {};
    // we should expect pwaClient to chain the return value of initializePWA
    await expect(pwaClient(pwaConfig)).resolves.toBeUndefined();
    expect(initializePWA).toHaveBeenCalledTimes(1);
    expect(initializePWA).toHaveBeenCalledWith(pwaConfig);
  });
});
