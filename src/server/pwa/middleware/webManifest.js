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

let webManifest = null;
let webManifestEnabled = false;

export function configureWebManifest({ enabled = false, manifest } = {}) {
  webManifestEnabled = enabled;
  if (enabled === false) {
    webManifest = null;
  } else {
    // when enabled, we set the webmanifest to the passed in manifest
    // or default to a basic preset
    webManifest = manifest || {
      name: 'One App',
      short_name: 'One App',
    };
  }
}

export function webManifestMiddleware() {
  return function webManifestMiddlewareHandler(req, res, next) {
    if (!webManifestEnabled) return next();
    return res
      .type('application/manifest+json')
      .send(webManifest);
  };
}
