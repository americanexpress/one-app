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
        webManifest: { short_name: 'One App Test' },
      })
    ).toThrow(
      new Error([
        '"recoveryMode" must be a boolean',
        '"escapeHatch" must be a boolean',
        '"scope" with value "\\" fails to match the required pattern: /^\\//',
        '"webManifest.name" is required',
      ].join('. '))
    );
  });
});
