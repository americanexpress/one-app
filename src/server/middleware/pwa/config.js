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

import fs from 'fs';
import path from 'path';

import { getClientStateConfig } from '../../utils/stateConfig';

import { validatePWAConfig } from './validation';

const defaultPWAConfig = {
  webManifest: false,
  serviceWorker: false,
  serviceWorkerRecoveryMode: false,
  serviceWorkerType: null,
  serviceWorkerScope: null,
  serviceWorkerScript: null,
};

let webAppManifest = null;
let pwaConfig = { ...defaultPWAConfig };

function resetPWAConfig() {
  pwaConfig = { ...defaultPWAConfig };
}

function setPWAConfig(newConfiguration) {
  pwaConfig = newConfiguration;
  return pwaConfig;
}

function createServiceWorkerConfig(config) {
  let enabled = false;
  let scope = null;
  let type = null;
  let script = null;

  // the type dictates the service worker script to be used
  if (config.serviceWorker) {
    type = 'standard';
    script = fs.readFileSync(path.join(__dirname, 'scripts/sw.js'));
  } else if (config.escapeHatch) {
    type = 'escape-hatch';
    script = Buffer.from('self.unregister();');
  } else if (config.recoveryMode) {
    type = 'recovery';
    script = fs.readFileSync(path.join(__dirname, 'scripts/sw.noop.js'));
  }

  if (type) {
    // with a valid type, we can be sure that the service worker will be
    // ready to enable and assign a scope
    enabled = true;
    scope = config.scope || '/';
  }

  return {
    serviceWorker: enabled,
    serviceWorkerRecoveryMode: ['escape-hatch', 'recovery'].includes(type),
    serviceWorkerScope: scope,
    serviceWorkerScript: script,
    serviceWorkerType: type,
  };
}

function createWebManifestConfig(config, serviceWorkerConfig) {
  const webManifest = !!(serviceWorkerConfig.serviceWorker && config.webManifest);
  return {
    webManifest,
    webManifestObject: webManifest ? config.webManifest : null,
  };
}

function validateConfig(config) {
  if (!config) return {};

  const object = { ...config };

  if (typeof config.webManifest === 'function') object.webManifest = config.webManifest(getClientStateConfig());

  return validatePWAConfig(object);
}

export function getWebAppManifestConfig() {
  return { webManifest: webAppManifest, webManifestEnabled: pwaConfig.webManifest };
}

export function getServerPWAConfig() {
  return { ...pwaConfig };
}

export function getClientPWAConfig() {
  const {
    webManifest, serviceWorker, serviceWorkerRecoveryMode, serviceWorkerScope,
  } = pwaConfig;
  return {
    serviceWorker,
    serviceWorkerRecoveryMode,
    serviceWorkerScope,
    serviceWorkerScriptUrl: serviceWorker && '/_/pwa/service-worker.js',
    webManifestUrl: webManifest && '/_/pwa/manifest.webmanifest',
  };
}

export function configurePWA(config) {
  // feature flag will not allow pwa/service-worker to be configured
  // it will default to a disabled state regardless if `appConfig.pwa` was provided
  if (process.env.ONE_SERVICE_WORKER !== 'true') {
    // eslint-disable-next-line no-param-reassign
    config = null;
  }

  if (!config && pwaConfig.serviceWorker) {
    // if there was a previous configuration present, we want to gracefully
    // remove any remaining instances. We currently handle this client side
    // and would only need to reset the configuration when we want to decouple.
    resetPWAConfig();
  }

  const validatedConfig = validateConfig(config);

  const serviceWorkerConfig = createServiceWorkerConfig(validatedConfig);
  const {
    webManifestObject, webManifest,
  } = createWebManifestConfig(validatedConfig, serviceWorkerConfig);

  webAppManifest = webManifestObject ? Buffer.from(JSON.stringify(webManifestObject)) : null;

  return setPWAConfig({
    ...serviceWorkerConfig,
    webManifest,
  });
}
