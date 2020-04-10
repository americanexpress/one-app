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

import * as pwaConfig from '../../../src/server/pwa/config';

const {
  resetPWAConfig,
  getPWAConfig,
  getClientPWAConfig,
  setPWAConfig,
  configurePWA,
} = pwaConfig;

jest.mock('fs', () => ({
  readFileSync: (filePath) => ({ toString: () => (filePath.endsWith('noop.js') ? '[service-worker-noop-script]' : '[service-worker-script]') }),
}));

describe('pwa configuration', () => {
  test('getters return default state', () => {
    expect(getPWAConfig()).toMatchObject({
      enabled: false,
      escapeHatch: false,
      noop: false,
    });
    expect(getClientPWAConfig()).toMatchObject({
      enabled: false,
      scope: null,
      scriptUrl: false,
    });
  });

  test('resetting pwa config', () => {
    expect(resetPWAConfig()).toEqual({
      enabled: false,
      escapeHatch: false,
      noop: false,
    });
    expect(getPWAConfig()).toEqual({
      enabled: false,
      escapeHatch: false,
      noop: false,
    });
  });

  test('setting service worker configuration', () => {
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

  describe('configuration', () => {
    test('configuring the service worker and webmanifest to be enabled', () => {
      const config = {
        enabled: true,
      };
      const expectedConfig = {
        enabled: true,
        escapeHatch: false,
        noop: false,
        scope: '/',
      };

      expect(configurePWA(config)).toMatchObject(expectedConfig);
      expect(getPWAConfig()).toMatchObject(expectedConfig);
      expect(getClientPWAConfig()).toMatchObject({
        enabled: true,
        scope: '/',
        scriptUrl: expect.any(String),
      });
    });

    test('disabling PWA configuration', () => {
      expect(configurePWA({ enabled: false })).toMatchObject({ enabled: false });
      expect(getPWAConfig()).toMatchObject({ enabled: false });
      expect(getClientPWAConfig()).toMatchObject({
        enabled: false, scope: null, scriptUrl: false,
      });
    });
  });
});
