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

import {
  validatePWAConfig,
} from '../../../../src/server/middleware/pwa/validation';

describe('validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.spyOn(console, 'warn');
    jest.spyOn(console, 'error');
    console.warn.mockImplementation();
    console.error.mockImplementation();
  });

  test('invalid configuration object informs the user', () => {
    expect(validatePWAConfig(null)).toEqual(null);
    expect(validatePWAConfig([])).toEqual(null);
    expect(console.error).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledWith('invalid config given to service worker (expected "object")');
  });

  test('invalid configuration keys informs the user and ignores them', () => {
    expect(validatePWAConfig({
      random: 'key',
      foo: 'bar',
    })).toEqual({});
    expect(console.warn).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledWith('supplied configuration key "random" is not a valid property - ignoring');
    expect(console.warn).toHaveBeenCalledWith('supplied configuration key "foo" is not a valid property - ignoring');
  });

  test('invalid configuration values for keys informs the user and ignores them', () => {
    expect(validatePWAConfig({
      serviceWorker: 'true',
      scope: 42,
    })).toEqual({});
    expect(console.warn).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledWith('invalid value type given for configuration key "serviceWorker" (expected "Boolean") - ignoring');
    expect(console.warn).toHaveBeenCalledWith('invalid value type given for configuration key "scope" (expected "String") - ignoring');
  });

  test('valid keys emits no warnings or errors and returns valid configuration', () => {
    const validConfig = {
      serviceWorker: true,
      scope: '/',
    };

    expect(validatePWAConfig(validConfig)).toEqual(validConfig);
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});
