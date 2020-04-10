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
  isBoolean, isString, isPlainObject, validatePWAConfig,
} from '../../../src/server/pwa/validation';

describe('isBoolean', () => {
  test('returns true if a boolean', () => {
    expect(isBoolean(false)).toBe(true);
    expect(isBoolean(true)).toBe(true);
  });

  test('returns false if not a boolean', () => {
    expect(isBoolean('true')).toBe(false);
    expect(isBoolean({})).toBe(false);
    expect(isBoolean(null)).toBe(false);
    expect(isBoolean([])).toBe(false);
  });
});

describe('isString', () => {
  test('returns true if a string', () => {
    expect(isString('str')).toBe(true);
    expect(isString(`${true}`)).toBe(true);
  });

  test('returns false if not a string', () => {
    expect(isString(true)).toBe(false);
    expect(isString({})).toBe(false);
    expect(isString(null)).toBe(false);
    expect(isString([])).toBe(false);
  });
});

describe('isPlainObject', () => {
  test('returns true if a plain object', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ foo: {} })).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  test('returns false if not a plain object', () => {
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject('{  }')).toBe(false);
    expect(isPlainObject('true')).toBe(false);
  });
});

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
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith('invalid config given to service worker (expected "object")');
    expect(validatePWAConfig([])).toEqual(null);
    expect(validatePWAConfig(true)).toEqual(null);
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
      enabled: 'true',
      scope: 42,
    })).toEqual({});
    expect(console.warn).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledWith('invalid value type given for configuration key "enabled" (expected "Boolean") - ignoring');
    expect(console.warn).toHaveBeenCalledWith('invalid value type given for configuration key "scope" (expected "String") - ignoring');
  });

  test('valid keys emits no warnings or errors and returns valid configuration', () => {
    const validConfig = {
      enabled: true,
      scope: '/',
    };

    expect(validatePWAConfig(validConfig)).toEqual(validConfig);
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});
