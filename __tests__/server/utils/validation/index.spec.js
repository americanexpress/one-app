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

import { validatePWAConfig } from '../../../../src/server/utils/validation';

describe(validatePWAConfig.name, () => {
  test('valid pwa config using a function', () => {
    const clientUrl = 'https://example.com/api';
    expect(
      validatePWAConfig({
        serviceWorker: true,
        scope: '/',
        webManifest: (config) => ({ name: 'One App Test', start_url: config.startUrl }),
      }, {
        clientStateConfig: {
          startUrl: clientUrl,
        },
      })
    ).toEqual({
      serviceWorker: true,
      scope: '/',
      webManifest: { name: 'One App Test', start_url: clientUrl },
    });
  });

  test('invalid pwa config', () => {
    expect(
      () => validatePWAConfig({
        serviceWorker: 'true',
        escapeHatch: 0,
        recoveryMode: [],
        scope: '\\',
        webManifest: {
          short_name: /One App Test/,
          start_url: '[start_url',
          scope: 0,
          display: 'sideways',
          categories: ['pwa', 1234],
          icons: [{
            src: false,
          }],
        },
      })
    ).toThrow(
      new Error([
        '"recoveryMode" must be a boolean',
        '"escapeHatch" must be a boolean',
        '"scope" must be a relative or absolute URL',
        '"webManifest.name" is required',
        '"webManifest.short_name" must be a string',
        '"webManifest.scope" must be a string',
        '"webManifest.start_url" must be a relative or absolute URL',
        '"webManifest.categories[1]" must be a string',
        '"webManifest.display" must be one of [fullscreen, standalone, minimal-ui, browser]',
        '"webManifest.icons[0].src" must be a string',
      ].join('. '))
    );
  });
});
