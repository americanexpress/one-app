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

function isString(value) {
  return typeof value === 'string';
}

function isBoolean(value) {
  return typeof value === 'boolean';
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && Array.isArray(value) === false;
}

const validKeys = new Map([
  ['serviceWorker', isBoolean],
  ['recoveryMode', isBoolean],
  ['escapeHatch', isBoolean],
  ['scope', isString],
]);

// eslint-disable-next-line import/prefer-default-export
export function validatePWAConfig(configToValidate) {
  if (!isPlainObject(configToValidate)) {
    console.error('invalid config given to service worker (expected "object")');
    return null;
  }

  return Object.keys(configToValidate)
    .map((key) => {
      if (!validKeys.has(key)) {
        console.warn(`supplied configuration key "${key}" is not a valid property - ignoring`);
        return null;
      }

      const testValueType = validKeys.get(key);
      const configToValidateValue = configToValidate[key];

      if (!testValueType(configToValidateValue)) {
        console.warn(
          `invalid value type given for configuration key "${key}" (expected "${testValueType.name.replace('is', '')}") - ignoring`
        );
        return null;
      }

      return [key, configToValidateValue];
    })
    .filter((value) => !!value)
    .reduce((map, [key, value]) => ({ ...map, [key]: value }), {});
}
