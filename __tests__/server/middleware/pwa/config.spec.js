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
  getClientPWAConfig,
  configurePWA,
} from '../../../../src/server/middleware/pwa/config';

jest.mock('fs', () => ({
  readFileSync: (filePath) => ({ toString: () => (filePath.endsWith('noop.js') ? '[service-worker-noop-script]' : '[service-worker-script]') }),
}));

describe('pwa configuration', () => {
  beforeAll(() => {
    process.env.ONE_SERVICE_WORKER = true;
  });

  test('getters return default state', () => {
    expect(getClientPWAConfig()).toMatchObject({
      serviceWorker: false,
      serviceWorkerRecoveryMode: false,
      serviceWorkerScriptUrl: false,
      serviceWorkerScope: null,
    });
  });

  describe('configuration', () => {
    test('enabling the service worker with minimum config', () => {
      expect(configurePWA({
        serviceWorker: true,
      })).toMatchObject({
        serviceWorker: true,
        serviceWorkerRecoveryMode: false,
        serviceWorkerType: 'standard',
        serviceWorkerScope: '/',
      });
      expect(getClientPWAConfig()).toMatchObject({
        serviceWorker: true,
        serviceWorkerRecoveryMode: false,
        serviceWorkerScope: '/',
        serviceWorkerScriptUrl: '/_/pwa/service-worker.js',
      });
    });

    test('enabling the service worker in recovery mode', () => {
      expect(configurePWA({
        recoveryMode: true,
      })).toMatchObject({
        serviceWorker: true,
        serviceWorkerRecoveryMode: true,
        serviceWorkerType: 'recovery',
        serviceWorkerScope: '/',
      });
      expect(getClientPWAConfig()).toMatchObject({
        serviceWorker: true,
        serviceWorkerRecoveryMode: true,
        serviceWorkerScope: '/',
        serviceWorkerScriptUrl: '/_/pwa/service-worker.js',
      });
    });

    test('enabling the service worker with escape hatch', () => {
      expect(configurePWA({
        escapeHatch: true,
      })).toMatchObject({
        serviceWorker: true,
        serviceWorkerRecoveryMode: true,
        serviceWorkerType: 'escape-hatch',
        serviceWorkerScope: '/',
      });
      expect(getClientPWAConfig()).toMatchObject({
        serviceWorker: true,
        serviceWorkerRecoveryMode: true,
        serviceWorkerScope: '/',
        serviceWorkerScriptUrl: '/_/pwa/service-worker.js',
      });
    });

    test('service worker feature flag will reset config to defaults if disabled', () => {
      process.env.ONE_SERVICE_WORKER = false;
      expect(configurePWA({
        serviceWorker: true,
      })).toMatchObject({
        serviceWorker: false,
        serviceWorkerRecoveryMode: false,
        serviceWorkerType: null,
        serviceWorkerScope: null,
      });
      expect(getClientPWAConfig()).toMatchObject({
        serviceWorker: false,
        serviceWorkerRecoveryMode: false,
        serviceWorkerScriptUrl: false,
        serviceWorkerScope: null,
      });
      process.env.ONE_SERVICE_WORKER = true;
    });

    test('disabling PWA configuration', () => {
      expect(configurePWA({ serviceWorker: false })).toMatchObject({ serviceWorker: false });
      expect(getClientPWAConfig()).toMatchObject({
        serviceWorker: false,
        serviceWorkerRecoveryMode: false,
        serviceWorkerScriptUrl: false,
        serviceWorkerScope: null,
      });
    });

    test('resetting PWA configuration when root module opts out', () => {
      expect(configurePWA({ serviceWorker: true })).toMatchObject({ serviceWorker: true });
      expect(configurePWA()).toMatchObject({ serviceWorker: false });
    });
  });
});
