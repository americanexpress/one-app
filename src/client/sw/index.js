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

export function importPWAChunk(config) {
  // in the future, we should consider making one-service worker added dynamically
  // as an external chunk that is conditionally loadable and provide it to one-app
  // users/modules that want to use the library
  return import(/* webpackChunkName: "pwa-client" */ './client')
    .then((imported) => imported.default)
    .then((pwaClient) => pwaClient(config));
}

export function initializePWA(config = { enabled: false }) {
  // since we handle unregistering of the service worker via the service workers
  // that we distribute server side, we should not call in the chunk unless we plan
  // to register the service worker.
  // in the case that the service worker is unavailable, we would
  // not need to call in the chunk as well.
  if ('serviceWorker' in navigator === false || config.enabled === false) return Promise.resolve();
  // before we call in the pwa chunk, we can check to see if the service worker
  // is already registered and if not, we can load up the library and register the worker.
  return navigator.serviceWorker.getRegistration()
    .then((registration) => registration || importPWAChunk(config));
}
