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
  getWebAppManifestConfig,
  getServerPWAConfig,
  getClientPWAConfig,
  configurePWA,
} from '../../../../src/server/middleware/pwa/config';

jest.mock('fs', () => ({
  existsSync: () => false,
  readFileSync: (filePath) => Buffer.from(
    filePath.endsWith('noop.js') ? '[service-worker-noop-script]' : '[service-worker-script]'
  ),
}));

describe('pwa configuration', () => {
  const serviceWorkerStandardScript = Buffer.from('[service-worker-script]');
  const serviceWorkerRecoveryScript = Buffer.from('[service-worker-noop-script]');
  const serviceWorkerEscapeHatchScript = Buffer.from('self.unregister();');

  beforeEach(() => {
    process.env.ONE_SERVICE_WORKER = true;
  });

  test('getters return default state', () => {
    expect(getWebAppManifestConfig()).toMatchInlineSnapshot(`
      Object {
        "webManifest": null,
        "webManifestEnabled": false,
      }
    `);
    expect(getServerPWAConfig()).toMatchInlineSnapshot(`
      Object {
        "serviceWorker": false,
        "serviceWorkerRecoveryMode": false,
        "serviceWorkerScope": null,
        "serviceWorkerScript": null,
        "serviceWorkerType": null,
        "webManifest": false,
      }
    `);
    expect(getClientPWAConfig()).toMatchInlineSnapshot(`
      Object {
        "asObject": Object {
          "offlineUrl": false,
          "serviceWorker": false,
          "serviceWorkerRecoveryMode": false,
          "serviceWorkerScope": null,
          "serviceWorkerScriptUrl": false,
          "webManifestUrl": false,
        },
        "asString": "{\\"serviceWorker\\":false,\\"serviceWorkerRecoveryMode\\":false,\\"serviceWorkerScope\\":null,\\"serviceWorkerScriptUrl\\":false,\\"webManifestUrl\\":false,\\"offlineUrl\\":false}",
      }
    `);
  });

  describe('service worker configuration', () => {
    test('no config given', () => {
      configurePWA();
      expect(getServerPWAConfig()).toMatchInlineSnapshot(`
        Object {
          "serviceWorker": false,
          "serviceWorkerRecoveryMode": false,
          "serviceWorkerScope": null,
          "serviceWorkerScript": null,
          "serviceWorkerType": null,
          "webManifest": false,
        }
      `);
    });

    test('enabling the service worker with minimum config', () => {
      configurePWA({ serviceWorker: true });

      expect(getServerPWAConfig()).toMatchObject({
        serviceWorker: true,
        serviceWorkerRecoveryMode: false,
        serviceWorkerType: 'standard',
        serviceWorkerScope: '/',
        serviceWorkerScript: serviceWorkerStandardScript,
      });
      expect(getClientPWAConfig()).toMatchInlineSnapshot(`
        Object {
          "asObject": Object {
            "offlineUrl": "/_/pwa/shell",
            "serviceWorker": true,
            "serviceWorkerRecoveryMode": false,
            "serviceWorkerScope": "/",
            "serviceWorkerScriptUrl": "/_/pwa/service-worker.js",
            "webManifestUrl": false,
          },
          "asString": "{\\"serviceWorker\\":true,\\"serviceWorkerRecoveryMode\\":false,\\"serviceWorkerScope\\":\\"/\\",\\"serviceWorkerScriptUrl\\":\\"/_/pwa/service-worker.js\\",\\"webManifestUrl\\":false,\\"offlineUrl\\":\\"/_/pwa/shell\\"}",
        }
      `);
    });

    test('enabling the service worker in recovery mode', () => {
      configurePWA({ recoveryMode: true });

      expect(getServerPWAConfig()).toMatchObject({
        serviceWorker: true,
        serviceWorkerRecoveryMode: true,
        serviceWorkerType: 'recovery',
        serviceWorkerScope: '/',
        serviceWorkerScript: serviceWorkerRecoveryScript,
      });
      expect(getClientPWAConfig()).toMatchInlineSnapshot(`
        Object {
          "asObject": Object {
            "offlineUrl": "/_/pwa/shell",
            "serviceWorker": true,
            "serviceWorkerRecoveryMode": true,
            "serviceWorkerScope": "/",
            "serviceWorkerScriptUrl": "/_/pwa/service-worker.js",
            "webManifestUrl": false,
          },
          "asString": "{\\"serviceWorker\\":true,\\"serviceWorkerRecoveryMode\\":true,\\"serviceWorkerScope\\":\\"/\\",\\"serviceWorkerScriptUrl\\":\\"/_/pwa/service-worker.js\\",\\"webManifestUrl\\":false,\\"offlineUrl\\":\\"/_/pwa/shell\\"}",
        }
      `);
    });

    test('enabling the service worker with escape hatch', () => {
      configurePWA({ escapeHatch: true });

      expect(getServerPWAConfig()).toMatchObject({
        serviceWorker: true,
        serviceWorkerRecoveryMode: true,
        serviceWorkerType: 'escape-hatch',
        serviceWorkerScope: '/',
        serviceWorkerScript: serviceWorkerEscapeHatchScript,
      });
      expect(getClientPWAConfig()).toMatchInlineSnapshot(`
        Object {
          "asObject": Object {
            "offlineUrl": "/_/pwa/shell",
            "serviceWorker": true,
            "serviceWorkerRecoveryMode": true,
            "serviceWorkerScope": "/",
            "serviceWorkerScriptUrl": "/_/pwa/service-worker.js",
            "webManifestUrl": false,
          },
          "asString": "{\\"serviceWorker\\":true,\\"serviceWorkerRecoveryMode\\":true,\\"serviceWorkerScope\\":\\"/\\",\\"serviceWorkerScriptUrl\\":\\"/_/pwa/service-worker.js\\",\\"webManifestUrl\\":false,\\"offlineUrl\\":\\"/_/pwa/shell\\"}",
        }
      `);
    });

    test('service worker feature flag will reset config to defaults if disabled', () => {
      process.env.ONE_SERVICE_WORKER = false;
      configurePWA({ serviceWorker: true });

      expect(getServerPWAConfig()).toMatchInlineSnapshot(`
        Object {
          "serviceWorker": false,
          "serviceWorkerRecoveryMode": false,
          "serviceWorkerScope": null,
          "serviceWorkerScript": null,
          "serviceWorkerType": null,
          "webManifest": false,
        }
      `);
      expect(getClientPWAConfig()).toMatchInlineSnapshot(`
        Object {
          "asObject": Object {
            "offlineUrl": false,
            "serviceWorker": false,
            "serviceWorkerRecoveryMode": false,
            "serviceWorkerScope": null,
            "serviceWorkerScriptUrl": false,
            "webManifestUrl": false,
          },
          "asString": "{\\"serviceWorker\\":false,\\"serviceWorkerRecoveryMode\\":false,\\"serviceWorkerScope\\":null,\\"serviceWorkerScriptUrl\\":false,\\"webManifestUrl\\":false,\\"offlineUrl\\":false}",
        }
      `);
    });

    test('disabling PWA configuration', () => {
      configurePWA({ serviceWorker: false });

      expect(getServerPWAConfig()).toMatchInlineSnapshot(`
        Object {
          "serviceWorker": false,
          "serviceWorkerRecoveryMode": false,
          "serviceWorkerScope": null,
          "serviceWorkerScript": null,
          "serviceWorkerType": null,
          "webManifest": false,
        }
      `);
      expect(getClientPWAConfig()).toMatchInlineSnapshot(`
        Object {
          "asObject": Object {
            "offlineUrl": false,
            "serviceWorker": false,
            "serviceWorkerRecoveryMode": false,
            "serviceWorkerScope": null,
            "serviceWorkerScriptUrl": false,
            "webManifestUrl": false,
          },
          "asString": "{\\"serviceWorker\\":false,\\"serviceWorkerRecoveryMode\\":false,\\"serviceWorkerScope\\":null,\\"serviceWorkerScriptUrl\\":false,\\"webManifestUrl\\":false,\\"offlineUrl\\":false}",
        }
      `);
    });

    test('resetting PWA configuration when root module opts out', () => {
      expect(configurePWA({ serviceWorker: true })).toMatchObject({ serviceWorker: true });
      expect(configurePWA()).toMatchObject({ serviceWorker: false });
    });
  });

  describe('web app manifest configuration', () => {
    test('enabling the web manifest', () => {
      configurePWA({
        serviceWorker: true,
        webManifest: {
          name: 'One App Test',
        },
      });

      expect(getServerPWAConfig()).toMatchObject({
        webManifest: true,
        serviceWorker: true,
        serviceWorkerRecoveryMode: false,
        serviceWorkerScope: '/',
      });
      expect(getClientPWAConfig()).toMatchInlineSnapshot(`
        Object {
          "asObject": Object {
            "offlineUrl": "/_/pwa/shell",
            "serviceWorker": true,
            "serviceWorkerRecoveryMode": false,
            "serviceWorkerScope": "/",
            "serviceWorkerScriptUrl": "/_/pwa/service-worker.js",
            "webManifestUrl": "/_/pwa/manifest.webmanifest",
          },
          "asString": "{\\"serviceWorker\\":true,\\"serviceWorkerRecoveryMode\\":false,\\"serviceWorkerScope\\":\\"/\\",\\"serviceWorkerScriptUrl\\":\\"/_/pwa/service-worker.js\\",\\"webManifestUrl\\":\\"/_/pwa/manifest.webmanifest\\",\\"offlineUrl\\":\\"/_/pwa/shell\\"}",
        }
      `);
    });

    test('opting out of the web manifest', () => {
      configurePWA({
        serviceWorker: true,
        webManifest: null,
      });

      expect(getServerPWAConfig()).toMatchObject({
        webManifest: false,
        serviceWorker: true,
        serviceWorkerRecoveryMode: false,
        serviceWorkerScope: '/',
      });
      expect(getClientPWAConfig()).toMatchInlineSnapshot(`
        Object {
          "asObject": Object {
            "offlineUrl": "/_/pwa/shell",
            "serviceWorker": true,
            "serviceWorkerRecoveryMode": false,
            "serviceWorkerScope": "/",
            "serviceWorkerScriptUrl": "/_/pwa/service-worker.js",
            "webManifestUrl": false,
          },
          "asString": "{\\"serviceWorker\\":true,\\"serviceWorkerRecoveryMode\\":false,\\"serviceWorkerScope\\":\\"/\\",\\"serviceWorkerScriptUrl\\":\\"/_/pwa/service-worker.js\\",\\"webManifestUrl\\":false,\\"offlineUrl\\":\\"/_/pwa/shell\\"}",
        }
      `);
    });
  });
});
