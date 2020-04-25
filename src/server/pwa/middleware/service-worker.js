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

let serviceWorkerEnabled = false;
let serviceWorkerScript = null;
let serviceWorkerScope = null;

export function readServiceWorkerRecoveryScript() {
  // this file is created during build inside lib/server/middleware/pwa
  return fs.readFileSync(path.join(__dirname, 'scripts/sw.noop.js'));
}

export function readServiceWorkerScript() {
  // this file is created during build inside lib/server/middleware/pwa
  return fs.readFileSync(path.join(__dirname, 'scripts/sw.js'));
}

export function createServiceWorkerEscapeHatchScript() {
  return Buffer.from('self.unregister();');
}

export function configureServiceWorker({
  type, scope = '/',
} = {}) {
  serviceWorkerEnabled = true;
  serviceWorkerScope = scope;

  switch (type) {
    case 'escape-hatch':
      serviceWorkerScript = createServiceWorkerEscapeHatchScript();
      break;
    case 'recovery':
      serviceWorkerScript = readServiceWorkerRecoveryScript();
      break;
    case 'standard':
      serviceWorkerScript = readServiceWorkerScript();
      break;
    default:
      serviceWorkerEnabled = false;
      serviceWorkerScope = null;
      serviceWorkerScript = null;
      break;
  }
}

export function serviceWorkerMiddleware() {
  return function serviceWorkerMiddlewareHandler(req, res, next) {
    if (serviceWorkerEnabled === false) return next();
    return res
      .type('js')
      .set('Service-Worker-Allowed', serviceWorkerScope)
      .set('Cache-Control', 'no-store, no-cache')
      .send(serviceWorkerScript);
  };
}
