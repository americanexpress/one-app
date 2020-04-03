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

import { isBoolean, isString, isPlainObject } from '../../../src/server/utils/typeChecks';

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
