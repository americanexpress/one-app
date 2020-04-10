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
  configureWebManifest,
  getWebManifestEnabled,
  getWebManifest,
  setWebManifest,
  resetWebManifest,
} from '../../../../src/server/pwa/middleware/manifest';

describe('webmanifest middleware', () => {
  test('exports functions as default', () => {
    expect.assertions(6);
    expect(webmanifestMiddleware).toBeInstanceOf(Function);
    expect(configureWebManifest).toBeInstanceOf(Function);
    expect(getWebManifestEnabled).toBeInstanceOf(Function);
    expect(getWebManifest).toBeInstanceOf(Function);
    expect(setWebManifest).toBeInstanceOf(Function);
    expect(resetWebManifest).toBeInstanceOf(Function);
  });

  test('gets a valid webmanifest and gets enabled value', () => {
    expect.assertions(2);
    expect(getWebManifestEnabled()).toEqual(false);
    expect(getWebManifest()).toBe(null);
  });

  test('resets the webmanifest', () => {
    expect.assertions(1);
    expect(resetWebManifest()).toMatchObject({
      name: expect.any(String),
      short_name: expect.any(String),
    });
  });

  test('sets the webmanifest value', () => {
    expect.assertions(3);
    expect(setWebManifest({ name: 'One App Test' })).toMatchObject({
      name: 'One App Test',
      short_name: expect.any(String),
    });
    expect(getWebManifestEnabled()).toEqual(false);
    expect(getWebManifest()).toMatchObject({
      name: 'One App Test',
      short_name: expect.any(String),
    });
  });

  test('configuring the webmanifest without params does nothing', () => {
    expect.assertions(3);
    expect(configureWebManifest()).toBeUndefined();
    expect(getWebManifestEnabled()).toEqual(false);
    expect(getWebManifest()).toEqual(null);
  });

  test('configures the webmanifest and enables it', () => {
    expect.assertions(3);
    expect(configureWebManifest({ enabled: true, manifest: { short_name: 'one-app-test' } })).toBeUndefined();
    expect(getWebManifestEnabled()).toEqual(true);
    expect(getWebManifest()).toMatchObject({
      name: expect.any(String),
      short_name: expect.any(String),
    });
  });

  test('configures the webmanifest but does not enable by default', () => {
    expect.assertions(3);
    expect(configureWebManifest({ manifest: { short_name: 'one-app-test' } })).toBeUndefined();
    expect(getWebManifestEnabled()).toEqual(false);
    expect(getWebManifest()).toEqual(null);
  });

  test('disables the webmanifest', () => {
    expect.assertions(3);
    expect(configureWebManifest({ enabled: false })).toBeUndefined();
    expect(getWebManifestEnabled()).toEqual(false);
    expect(getWebManifest()).toBe(null);
  });

  describe('middleware', () => {
    beforeAll(configureWebManifest);

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
      configureWebManifest({ enabled: true, manifest: { name: 'One App Test' } });
      expect(middleware(null, { type, send }, next)).toBeUndefined();
      expect(next).not.toHaveBeenCalled();
      expect(type).toHaveBeenCalledWith('application/manifest+json');
      expect(send).toHaveBeenCalledWith(getWebManifest());
    });
  });
});
