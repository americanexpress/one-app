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

let webmanifest = null;
let webmanifestEnabled = false;

export function resetWebmanifest() {
  webmanifest = {
    name: 'One App',
    short_name: 'One App',
  };
  return webmanifest;
}

export function getWebmanifestEnabled() {
  return webmanifestEnabled;
}

export function getWebmanifest() {
  return webmanifest;
}

export function setWebmanifest(manifest) {
  if (manifest === null) webmanifest = null;
  else Object.assign(resetWebmanifest(), manifest);
  return getWebmanifest();
}

export function configureWebmanifest({ enabled = false, manifest } = {}) {
  webmanifestEnabled = enabled;
  if (enabled === false) setWebmanifest(null);
  else setWebmanifest(manifest);
}

export function webmanifestMiddleware() {
  return function webmanifestMiddlewareHandler(req, res, next) {
    if (!webmanifestEnabled) return next();
    return res
      .type('json')
      .send(getWebmanifest());
  };
}
