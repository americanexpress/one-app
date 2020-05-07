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

export function importServiceWorkerClient(settings) {
  return import(/* webpackChunkName: "service-worker-client" */ './client')
    // get the default export and invoke with settings
    .then(({ default: serviceWorkerClient }) => serviceWorkerClient(settings));
}

function clearCache() {
  // get the instanced Cache key in browser CacheStorage
  return caches.keys().then(
    // remove cache instances (deleting cache entries in batch)
    (cacheKeys) => Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey))));
}

export function initializeServiceWorker({
  serviceWorker,
  recoveryMode,
  scriptUrl,
  scope,
  onError,
}) {
  // If the service worker is unavailable, we would not need
  // to call in the chunk since it is not supported in the given browser.
  if ('serviceWorker' in navigator === false) return Promise.resolve();

  // Before we load in the pwa chunk, we can make a few checks to avoid loading it, if not needed.
  return navigator.serviceWorker.getRegistration()
    .then((registration) => {
      // When the service Worker is not enabled (default)
      if (!serviceWorker) {
        // If by any chance a service worker is present, we clear the cache and remove it.
        if (registration) {
          return registration.unregister().then(clearCache).then(() => registration);
        }
        // When there is no registration, nothing further needed to be done.
        return null;
      }

      if (recoveryMode) {
        // Recovery mode is active if the escape-hatch or recovery scripts are enabled
        if (registration) {
          return registration.update().then(clearCache).then(() => registration);
        }
        // When Escape Hatch is active, updating the worker will unregister the worker
        // and make it redundant, any page navigation afterwards should yield no registration.
        return null;
      }

      // Normal operations will load up the library and integrate with the service worker
      return importServiceWorkerClient({ scriptUrl, scope, onError });
    });
}
