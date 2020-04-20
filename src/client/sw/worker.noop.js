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

self.addEventListener('install', function install() {
  self.skipWaiting();
});

self.addEventListener('activate', function activate(event) {
  // Loads each open browser tab/client at the exact url it is currently on.
  // Used to reset any existing service worker as it will be controlling these clients.
  event.waitUntil(
    // we filter all the clients that are open windows
    self.clients.matchAll({ type: 'window' })
      .then((windowClients) => {
        // for every client, we move them to their current url
        // for the current service worker to take effect
        windowClients.forEach((windowClient) => {
          windowClient.navigate(windowClient.url);
        });
      })
  );
});
