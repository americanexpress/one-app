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

import { validatePWAConfig } from './validation';
import { configureServiceWorker } from './service-worker';

const defaultPWAConfig = {
  serviceWorker: false,
  serviceWorkerRecoveryMode: false,
  serviceWorkerType: null,
  serviceWorkerScope: null,
};

let pwaConfig = { ...defaultPWAConfig };

function resetPWAConfig() {
  pwaConfig = { ...defaultPWAConfig };
}

function setPWAConfig(newConfiguration) {
  pwaConfig = newConfiguration;
  return pwaConfig;
}

export function getClientPWAConfig() {
  const { serviceWorker, serviceWorkerRecoveryMode, serviceWorkerScope } = pwaConfig;
  return {
    serviceWorker,
    serviceWorkerRecoveryMode,
    serviceWorkerScope,
    serviceWorkerScriptUrl: serviceWorker && '/_/pwa/service-worker.js',
  };
}

export function configurePWA(config) {
  // feature flag will not allow pwa/service-worker to be configured
  // it will default to a disabled state regardless if `appConfig.pwa` was provided
  if (process.env.ONE_SERVICE_WORKER !== 'true') {
    // eslint-disable-next-line no-param-reassign
    config = null;
    resetPWAConfig();
  }

  if (!config && pwaConfig.serviceWorker) {
    // if there was a previous configuration present, we want to gracefully
    // remove any remaining instances. We currently handle this client side
    // and would only need to reset the configuration when we want to decouple.
    resetPWAConfig();
  }

  const validatedConfig = config ? validatePWAConfig(config) : {};

  let enabled = false;
  let scope = null;
  let type = null;

  // the type dictates the service worker script to be used
  if (validatedConfig.escapeHatch) type = 'escape-hatch';
  else if (validatedConfig.recoveryMode) type = 'recovery';
  else if (validatedConfig.serviceWorker) type = 'standard';

  if (type) {
    // with a valid type, we can be sure that the service worker will be
    // ready to enable and assign a scope
    enabled = true;
    scope = validatedConfig.scope || '/';
  }

  configureServiceWorker({
    type,
    scope,
  });

  return setPWAConfig({
    serviceWorker: enabled,
    serviceWorkerScope: scope,
    serviceWorkerType: type,
    serviceWorkerRecoveryMode: ['escape-hatch', 'recovery'].includes(type),
  });
}
