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

import { skipWaiting, clientsClaim } from '@americanexpress/one-service-worker';

import {
  createInstallMiddleware,
  createActivateMiddleware,
} from '../../../../src/client/service-worker/events/lifecycle';

jest.mock('@americanexpress/one-service-worker', () => ({
  skipWaiting: () => 'skip-waiting',
  clientsClaim: () => 'clients-claim',
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createLifecycleMiddleware', () => {
  test('createInstallMiddleware uses skipWaiting', () => {
    expect(createInstallMiddleware()).toEqual(skipWaiting());
  });

  test('createActivateMiddleware uses clientsClaim', () => {
    expect(createActivateMiddleware()).toEqual(clientsClaim());
  });
});
