/*
 * Copyright 2019 American Express Travel Related Services Company, Inc.
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

let cache = {};

/* Filters bundle types so only the required client moduleBundleType is returned
in ../server/middleware/sendHtml.js and reducing the html payload size */
function filterBundles(moduleMap, moduleBundleType) {
  return {
    ...moduleMap,
    modules: Object.entries(moduleMap.modules).reduce((acc, [moduleName, moduleBundles]) => (
      {
        ...acc,
        [moduleName]: {
          baseUrl: moduleBundles[moduleBundleType].url.replace(/[^/]+\.js$/i, ''),
          [moduleBundleType]: moduleBundles[moduleBundleType],
        },
      }
    ), {}),
  };
}

export function setClientModuleMapCache(moduleMap) {
  cache = {
    browser: filterBundles(moduleMap, 'browser'),
    legacyBrowser: filterBundles(moduleMap, 'legacyBrowser'),
  };
}

export function getClientModuleMapCache() {
  return cache;
}
