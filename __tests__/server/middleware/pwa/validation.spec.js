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
      webManifest: [],
    })).toEqual({});
    expect(console.warn).toHaveBeenCalledTimes(3);
    expect(console.warn).toHaveBeenCalledWith('Invalid value type given for configuration key "serviceWorker" (expected "Boolean") - ignoring');
    expect(console.warn).toHaveBeenCalledWith('Invalid value type given for configuration key "scope" (expected "String") - ignoring');
    expect(console.warn).toHaveBeenCalledWith('Invalid value type given for configuration key "webManifest" (expected "WebManifest") - ignoring');
  });

  test('valid keys emits no warnings or errors and returns valid configuration', () => {
    const validConfig = {
      serviceWorker: true,
      scope: '/',
      webManifest: { name: 'my-app' },
    };

    expect(validatePWAConfig(validConfig)).toEqual(validConfig);
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  describe('web manifest validation', () => {
    test('web app manifest has valid keys emits no warnings or errors and returns valid configuration', () => {
      const validConfig = {
        serviceWorker: true,
        scope: '/',
        webManifest: {
          name: 'One App Test',
        },
      };
      expect(validatePWAConfig(validConfig)).toEqual(validConfig);
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });

    test('expects name to be required', () => {
      const validConfig = {
        serviceWorker: true,
        scope: '/',
        webManifest: {
          short_name: 'One App Test',
        },
      };
      expect(validatePWAConfig(validConfig)).toEqual(validConfig);
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    test('ignores unrecognized keys given', () => {
      const validConfig = {
        serviceWorker: true,
        scope: '/',
        webManifest: {
          name: 'One App Test',
          my_name: 'One App Test',
        },
      };
      expect(validatePWAConfig(validConfig)).toEqual({ ...validConfig, webManifest: { name: 'One App Test' } });
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.error).not.toHaveBeenCalled();
    });

    test('warns and ignores when invalid enumerable keys are used', () => {
      const validConfig = {
        serviceWorker: true,
        scope: '/',
        webManifest: {
          name: 'One App Test',
          display: 'big',
          orientation: 'up',
          direction: 'backwards',
        },
      };
      expect(validatePWAConfig(validConfig)).toEqual({ ...validConfig, webManifest: { name: 'One App Test' } });
      expect(console.warn).toHaveBeenCalledTimes(3);
      expect(console.error).not.toHaveBeenCalled();
    });

    test('warns and ignores when invalid shapes for array are used', () => {
      const validConfig = {
        serviceWorker: true,
        scope: '/',
        webManifest: {
          name: 'One App Test',
          icons: [{
            size: '72x72',
          }, {
            purpose: 'none',
          }],
          screenshots: [{
            href: 'https://screenshots.example.com/screenshot/latest',
          }],
          related_applications: [{
            store: 'new pwa store',
          }],
        },
      };
      expect(validatePWAConfig(validConfig)).toEqual({ ...validConfig, webManifest: { name: 'One App Test' } });
      expect(console.warn).toHaveBeenCalledTimes(3);
      expect(console.error).not.toHaveBeenCalled();
    });

    test('includes a valid web manifest when passed in', () => {
      const validConfig = {
        serviceWorker: true,
        scope: '/',
        webManifest: {
          lang: 'en-US',
          dir: 'auto',
          display: 'standalone',
          orientation: 'portrait',
          short_name: 'Test',
          name: 'One App Test',
          categories: ['testing', 'example'],
          icons: [{
            src: 'https://example.com/pwa-icon.png',
            type: 'img/png',
            sizes: '72x72',
            purpose: 'badge',
          }],
          screenshots: [{
            src: 'https://example.com/pwa-screenshot.png',
            type: 'img/png',
            sizes: '1024x768',
          }],
          related_applications: [{
            platform: 'new pwa store',
            url: 'https://platform.example.com/pwa',
            id: 'aiojfoahfaf',
          }],
        },
      };
      expect(validatePWAConfig(validConfig)).toEqual(validConfig);
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});
