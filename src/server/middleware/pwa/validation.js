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

function isString(valueToTest) {
  return typeof valueToTest === 'string';
}

function isBoolean(valueToTest) {
  return typeof valueToTest === 'boolean';
}

function isPlainObject(valueToTest) {
  return !!valueToTest && typeof valueToTest === 'object' && Array.isArray(valueToTest) === false;
}

function createIsRequired(isType) {
  return function isRequired(valueToTest) {
    return !!valueToTest && isType(valueToTest);
  };
}

function createIsEnum(enumerableValues, isType) {
  return function isEnum(valueToTest) {
    return isType(valueToTest) && enumerableValues.includes(valueToTest);
  };
}

function createIsArrayOf(isType) {
  return function isArrayOf(valuesToTest) {
    return Array.isArray(valuesToTest) && valuesToTest.map(isType).filter(Boolean);
  };
}

function createIsShape(objectShape) {
  return function isShape(objectValueToTest) {
    return Object.keys(objectValueToTest)
      .map((keyToTest) => {
        if (keyToTest in objectShape === false) return false;
        const testValueType = objectShape[keyToTest];
        const valueOfKey = objectValueToTest[keyToTest];
        return testValueType(valueOfKey) && [keyToTest, valueOfKey];
      })
      .filter(Boolean)
      .reduce((map, [configKey, value]) => ({ ...map, [configKey]: value }), null);
  };
}

function isWebManifest(manifestToValidate) {
  // we can accept either of these values if the user wishes to opt out
  if ([false, null].includes(manifestToValidate)) return null;
  // if not a plain object at this point we mark the manifest as invalid
  if (!isPlainObject(manifestToValidate)) {
    return false;
  }

  const webAppManifestKeys = new Map([
    ['background_color', isString],
    ['categories', createIsArrayOf(isString)],
    ['description', isString],
    ['dir', createIsEnum([
      'auto',
      'ltr',
      'rtl',
    ], isString)],
    ['display', createIsEnum([
      'fullscreen',
      'standalone',
      'minimal-ui',
      'browser',
    ], isString)],
    ['iarc_rating_id', isBoolean],
    ['icons', createIsArrayOf(
      createIsShape({
        src: isString,
        sizes: isString,
        type: isString,
        purpose: createIsEnum([
          'any',
          'maskable',
          'badge',
        ], isString),
      })
    )],
    ['lang', isString],
    ['name', createIsRequired(isString)],
    ['orientation', createIsEnum([
      'any',
      'natural',
      'landscape',
      'landscape-primary',
      'landscape-secondary',
      'portrait',
      'portrait-primary',
      'portrait-secondary',
    ], isString)],
    ['prefer_related_applications', isBoolean],
    ['related_applications', createIsArrayOf(
      createIsShape({
        platform: isString,
        url: isString,
        id: isString,
      })
    )],
    ['scope', isString],
    ['screenshots', createIsArrayOf(
      createIsShape({
        src: isString,
        sizes: isString,
        type: isString,
      })
    )],
    ['short_name', isString],
    ['start_url', isString],
    ['theme_color', isString],
  ]);
  // we manually add required properties (eg name)
  return [...new Set(Object.keys(manifestToValidate).concat('name'))]
    .map((keyToTest) => {
      if (!webAppManifestKeys.has(keyToTest)) {
        // warn that it's not a supported key
        console.warn(`The key "${keyToTest}" is not supported by the web app manifest - ignoring`);
        return null;
      }
      const testValueType = webAppManifestKeys.get(keyToTest);
      const valueOfKey = manifestToValidate[keyToTest];
      const testResult = testValueType(valueOfKey);
      if (['icons', 'related_applications', 'screenshots'].includes(keyToTest)) {
        if (testResult.length > 0) return [keyToTest, testResult];
        console.warn(`The key "${keyToTest}" did not have a valid values - ignoring`);
        return null;
      }
      if (!testResult) {
        // for all of our mandatory keys
        if (!valueOfKey && ['name'].includes(keyToTest)) {
          console.error(`The key "${keyToTest}" is required to be present, please set a value`);
        } else {
          // otherwise warn that the value used is incorrect
          console.warn(`The key "${keyToTest}" does not have a valid value - ignoring`);
        }
        return null;
      }
      return [keyToTest, valueOfKey];
    })
    .filter(Boolean)
    .reduce((map, [configKey, value]) => ({ ...map, [configKey]: value }), null);
}

// eslint-disable-next-line import/prefer-default-export
export function validatePWAConfig(configToValidate) {
  if (!isPlainObject(configToValidate)) {
    console.error('invalid config given to service worker (expected "object")');
    return null;
  }

  const validKeys = new Map([
    ['serviceWorker', isBoolean],
    ['recoveryMode', isBoolean],
    ['escapeHatch', isBoolean],
    ['scope', isString],
    ['webManifest', isWebManifest],
  ]);

  return Object.keys(configToValidate)
    .map((configKeyToValidate) => {
      if (!validKeys.has(configKeyToValidate)) {
        console.warn(`supplied configuration key "${configKeyToValidate}" is not a valid property - ignoring`);
        return null;
      }

      const configValueToValidate = configToValidate[configKeyToValidate];
      const testValueType = validKeys.get(configKeyToValidate);
      const testResults = testValueType(configValueToValidate);

      if (!testResults) {
        console.warn(
          `Invalid value type given for configuration key "${configKeyToValidate}" (expected "${testValueType.name.replace('is', '')}") - ignoring`
        );
        return null;
      }

      return [configKeyToValidate, configKeyToValidate === 'webManifest' ? testResults : configValueToValidate];
    })
    .filter(Boolean)
    .reduce((map, [configKey, value]) => ({ ...map, [configKey]: value }), {});
}
