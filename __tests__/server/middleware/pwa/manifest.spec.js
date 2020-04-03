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
  webmanifestMiddleware,
  configureWebmanifest,
  getWebmanifestEnabled,
  getWebmanifest,
  setWebmanifest,
  resetWebmanifest,
} from '../../../../src/server/middleware/pwa/manifest';

describe('webmanifest middleware', () => {
  test('exports functions as default', () => {
    expect.assertions(6);
    expect(webmanifestMiddleware).toBeInstanceOf(Function);
    expect(configureWebmanifest).toBeInstanceOf(Function);
    expect(getWebmanifestEnabled).toBeInstanceOf(Function);
    expect(getWebmanifest).toBeInstanceOf(Function);
    expect(setWebmanifest).toBeInstanceOf(Function);
    expect(resetWebmanifest).toBeInstanceOf(Function);
  });

  test('gets a valid webmanifest and gets enabled value', () => {
    expect.assertions(2);
    expect(getWebmanifestEnabled()).toEqual(false);
    expect(getWebmanifest()).toBe(null);
  });

  test('resets the webmanifest', () => {
    expect.assertions(1);
    expect(resetWebmanifest()).toMatchObject({
      name: expect.any(String),
      short_name: expect.any(String),
    });
  });

  test('sets the webmanifest value', () => {
    expect.assertions(3);
    expect(setWebmanifest({ name: 'One App Test' })).toMatchObject({
      name: 'One App Test',
      short_name: expect.any(String),
    });
    expect(getWebmanifestEnabled()).toEqual(false);
    expect(getWebmanifest()).toMatchObject({
      name: 'One App Test',
      short_name: expect.any(String),
    });
  });

  test('configuring the webmanifest without params does nothing', () => {
    expect.assertions(3);
    expect(configureWebmanifest()).toBeUndefined();
    expect(getWebmanifestEnabled()).toEqual(false);
    expect(getWebmanifest()).toEqual(null);
  });

  test('configures the webmanifest and enables it', () => {
    expect.assertions(3);
    expect(configureWebmanifest({ enabled: true, manifest: { short_name: 'one-app-test' } })).toBeUndefined();
    expect(getWebmanifestEnabled()).toEqual(true);
    expect(getWebmanifest()).toMatchObject({
      name: expect.any(String),
      short_name: expect.any(String),
    });
  });

  test('configures the webmanifest but does not enable by default', () => {
    expect.assertions(3);
    expect(configureWebmanifest({ manifest: { short_name: 'one-app-test' } })).toBeUndefined();
    expect(getWebmanifestEnabled()).toEqual(false);
    expect(getWebmanifest()).toEqual(null);
  });

  test('disables the webmanifest', () => {
    expect.assertions(3);
    expect(configureWebmanifest({ enabled: false })).toBeUndefined();
    expect(getWebmanifestEnabled()).toEqual(false);
    expect(getWebmanifest()).toBe(null);
  });

  describe('middleware', () => {
    beforeAll(configureWebmanifest);

    test('middleware factory returns function', () => {
      expect.assertions(1);
      expect(webmanifestMiddleware()).toBeInstanceOf(Function);
    });

    test('middleware calls next when disabled', () => {
      expect.assertions(2);
      const middleware = webmanifestMiddleware();
      const next = jest.fn();
      expect(middleware(null, null, next)).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('middleware responds with manifest', () => {
      expect.assertions(4);
      const middleware = webmanifestMiddleware();
      const next = jest.fn();
      const send = jest.fn();
      const type = jest.fn(() => ({ send }));
      configureWebmanifest({ enabled: true, manifest: { name: 'One App Test' } });
      expect(middleware(null, { type, send }, next)).toBeUndefined();
      expect(next).not.toHaveBeenCalled();
      expect(type).toHaveBeenCalledWith('json');
      expect(send).toHaveBeenCalledWith(getWebmanifest());
    });
  });
});
