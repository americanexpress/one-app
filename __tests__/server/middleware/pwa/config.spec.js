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
  resetPWAConfig,
  getPWAConfig,
  getClientPWAConfig,
  setPWAConfig,
  validatePWAConfig,
  configurePWA,
} from '../../../../src/server/middleware/pwa/config';

jest.mock('fs', () => ({
  readFileSync: (filePath) => ({ toString: () => (filePath.endsWith('noop.js') ? '[service-worker-noop-script]' : '[service-worker-script]') }),
}));

describe('pwa configuration', () => {
  test('exports functions as default', () => {
    expect.assertions(6);

    expect(resetPWAConfig).toBeInstanceOf(Function);
    expect(getPWAConfig).toBeInstanceOf(Function);
    expect(getClientPWAConfig).toBeInstanceOf(Function);
    expect(setPWAConfig).toBeInstanceOf(Function);
    expect(validatePWAConfig).toBeInstanceOf(Function);
    expect(configurePWA).toBeInstanceOf(Function);
  });

  test('getters return default state', () => {
    expect.assertions(2);

    expect(getPWAConfig()).toMatchObject({
      enabled: false,
      escapeHatch: false,
      noop: false,
    });
    expect(getClientPWAConfig()).toMatchObject({
      enabled: false,
      scope: null,
      manifest: null,
      scriptUrl: null,
    });
  });

  test('setting service worker configuration', () => {
    expect.assertions(3);

    expect(setPWAConfig({
      enabled: true,
    })).toMatchObject({
      enabled: true,
      escapeHatch: false,
      noop: false,
    });
    expect(setPWAConfig({
      escapeHatch: true,
    })).toMatchObject({
      enabled: false,
      escapeHatch: true,
      noop: false,
    });
    expect(setPWAConfig({
      noop: true,
    })).toMatchObject({
      enabled: false,
      escapeHatch: false,
      noop: true,
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    const { error, warn } = console;
    beforeAll(() => {
      console.warn = jest.fn();
      console.error = jest.fn();
    });
    afterAll(() => {
      console.warn = warn;
      console.error = error;
    });

    test('invalid configuration object informs the user', () => {
      expect.assertions(9);

      expect(validatePWAConfig(null)).toEqual(null);
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith('invalid config given to service worker (expected "object")');
      expect(validatePWAConfig([])).toEqual(null);
      expect(console.error).toHaveBeenCalledTimes(2);
      expect(console.error).toHaveBeenCalledWith('invalid config given to service worker (expected "object")');
      expect(validatePWAConfig(true)).toEqual(null);
      expect(console.error).toHaveBeenCalledTimes(3);
      expect(console.error).toHaveBeenCalledWith('invalid config given to service worker (expected "object")');
    });

    test('invalid configuration keys informs the user and ignores them', () => {
      expect.assertions(4);

      expect(validatePWAConfig({
        random: 'key',
        foo: 'bar',
      })).toEqual({});
      expect(console.warn).toHaveBeenCalledTimes(2);
      expect(console.warn).toHaveBeenCalledWith('supplied configuration key "random" is not a valid property - ignoring');
      expect(console.warn).toHaveBeenCalledWith('supplied configuration key "foo" is not a valid property - ignoring');
    });

    test('invalid configuration values for keys informs the user and ignores them', () => {
      expect.assertions(5);

      expect(validatePWAConfig({
        enabled: 'true',
        scope: 42,
        manifest: '',
      })).toEqual({});
      expect(console.warn).toHaveBeenCalledTimes(3);
      expect(console.warn).toHaveBeenCalledWith('invalid value type given for configuration key "enabled" (expected "Boolean") - ignoring');
      expect(console.warn).toHaveBeenCalledWith('invalid value type given for configuration key "scope" (expected "String") - ignoring');
      expect(console.warn).toHaveBeenCalledWith('invalid value type given for configuration key "manifest" (expected "PlainObject") - ignoring');
    });

    test('valid keys emits no warnings or errors and returns valid configuration', () => {
      expect.assertions(3);

      const validConfig = {
        enabled: true,
        scope: '/',
        manifest: {},
      };

      expect(validatePWAConfig(validConfig)).toEqual(validConfig);
      expect(console.warn).toHaveBeenCalledTimes(0);
      expect(console.error).toHaveBeenCalledTimes(0);
    });
  });

  describe('configuration', () => {
    test('configuring the service worker and webmanifest to be enabled', () => {
      expect.assertions(3);

      const manifest = {
        name: 'PWA Config',
        short_name: 'pwa_config',
        start_url: '/index.html',
      };
      const config = {
        enabled: true,
        manifest,
      };
      const expectedConfig = {
        enabled: true,
        escapeHatch: false,
        noop: false,
        scope: '/',
        manifest,
      };

      expect(configurePWA(config)).toMatchObject(expectedConfig);
      expect(getPWAConfig()).toMatchObject(expectedConfig);
      expect(getClientPWAConfig()).toMatchObject({
        enabled: true,
        scope: '/',
        scriptUrl: expect.any(String),
        manifest: expect.any(String),
      });
    });

    test('disabling PWA configuration', () => {
      expect.assertions(3);

      expect(configurePWA({ enabled: false })).toMatchObject({ enabled: false });
      expect(getPWAConfig()).toMatchObject({ enabled: false, manifest: null });
      expect(getClientPWAConfig()).toMatchObject({ enabled: false, scope: null, scriptUrl: null });
    });
  });
});
