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

let serviceWorkerScript = null;
let serviceWorkerScope = null;
let serviceWorkerType = null;
let serviceWorkerEnabled = false;

export function getServiceWorkerEnabled() {
  return serviceWorkerEnabled;
}

export function getServiceWorkerScope() {
  return serviceWorkerScope;
}

export function getServiceWorkerType() {
  return serviceWorkerType;
}

export function getServiceWorkerScript() {
  return serviceWorkerScript;
}

export function setServiceWorkerScript(value, scope) {
  if (scope) serviceWorkerScope = scope;
  else if (value) serviceWorkerScope = '/';
  else serviceWorkerScope = null;
  serviceWorkerScript = value;
  return serviceWorkerScript;
}

export function createServiceWorkerNoopScript() {
  // this file is created during build inside lib/server/middleware/pwa
  return fs.readFileSync([__dirname, 'scripts/sw.noop.js'].join('/')).toString();
}

export function createServiceWorkerScript() {
  // this file is created during build inside lib/server/middleware/pwa
  return fs.readFileSync([__dirname, 'scripts/sw.js'].join('/')).toString();
}

export function createServiceWorkerEscapeHatchScript() {
  return 'self.unregister();';
}

export function configureServiceWorker({
  enabled, escapeHatch, noop, scope,
} = {}) {
  if (escapeHatch) {
    serviceWorkerType = 'escape-hatch';
    serviceWorkerEnabled = true;
    setServiceWorkerScript(createServiceWorkerEscapeHatchScript(), scope);
  } else if (noop) {
    serviceWorkerType = 'noop';
    serviceWorkerEnabled = true;
    setServiceWorkerScript(createServiceWorkerNoopScript(), scope);
  } else if (enabled) {
    serviceWorkerType = 'standard';
    serviceWorkerEnabled = true;
    setServiceWorkerScript(createServiceWorkerScript(), scope);
  } else {
    serviceWorkerType = null;
    serviceWorkerEnabled = false;
    setServiceWorkerScript(null);
  }
}

export function serviceWorkerMiddleware() {
  return function serviceWorkerMiddlewareHandler(req, res, next) {
    if (serviceWorkerEnabled === false) return next();
    return res
      .type('js')
      .set('Service-Worker-Allowed', serviceWorkerScope)
      .set('Cache-Control', 'no-store, no-cache')
      .send(getServiceWorkerScript());
  };
}
