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

import createFetchMiddleware from '../../../../src/client/sw/middleware/fetch';

jest.mock('@americanexpress/one-service-worker');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createFetchMiddleware', () => {
  test('exports a function as default', () => {
    expect.assertions(1);
    expect(createFetchMiddleware).toBeInstanceOf(Function);
  });

  test('returns an array of middleware for use', () => {
    expect.assertions(1);
    expect(createFetchMiddleware()).toHaveLength(4);
  });
});
