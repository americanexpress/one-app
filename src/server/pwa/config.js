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

import { routes } from './createRouter';
import { isString, isBoolean, isPlainObject } from '../utils/typeChecks';
import {
  configureServiceWorker, getServiceWorkerEnabled, getServiceWorkerScope,
} from './middleware/service-worker';

const validKeys = new Map([
  ['enabled', isBoolean],
  ['escapeHatch', isBoolean],
  ['noop', isBoolean],
  ['scope', isString],
]);

let pwaConfig = null;

export function resetPWAConfig() {
  pwaConfig = {
    enabled: false,
    escapeHatch: false,
    noop: false,
  };
  return pwaConfig;
}

export function getPWAConfig() {
  if (pwaConfig === null) return resetPWAConfig();
  return pwaConfig;
}

export function setPWAConfig(value) {
  Object.assign(resetPWAConfig(), {
    enabled: getServiceWorkerEnabled(),
    scope: getServiceWorkerScope(),
  }, value);
  return pwaConfig;
}

export function getClientPWAConfig() {
  return {
    enabled: getServiceWorkerEnabled(),
    scope: getServiceWorkerScope(),
    scriptUrl: getServiceWorkerEnabled() && [routes.prefix, routes.worker].join(''),
  };
}

export function validatePWAConfig(configToValidate) {
  if (!isPlainObject(configToValidate)) {
    console.error('invalid config given to service worker (expected "object")');
    return null;
  }

  return Object.keys(configToValidate)
    .map((key) => {
      if (validKeys.has(key)) {
        const testValueType = validKeys.get(key);

        if (testValueType(configToValidate[key])) {
          return [key, configToValidate[key]];
        }

        console.warn(
          `invalid value type given for configuration key "${key}" (expected "${testValueType.name.replace('is', '')}") - ignoring`
        );
      } else console.warn(`supplied configuration key "${key}" is not a valid property - ignoring`);

      return null;
    })
    .filter((value) => !!value)
    .reduce((map, [key, value]) => ({ ...map, [key]: value }), {});
}

export function configurePWA(config) {
  const validatedConfig = validatePWAConfig(config);

  configureServiceWorker(validatedConfig);

  return setPWAConfig(validatedConfig);
}
