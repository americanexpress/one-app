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

export const webManifest = (config) => ({
  // like the service worker, we can set a scope which this manifest takes effect
  scope: '/',
  // when loading an installed PWA, we can set the starting url on entry/load
  start_url: '/success',
  name: 'Frank Lloyd Root',
  short_name: 'frank lloyd root',
  description: 'A Progressive Web App ready Holocron Module',
  display: 'standalone',
  background_color: '#FFF',
  theme_color: '#FDB92D',
  icons: [
    {
      src: `${config.cdnUrl}modules/frank-lloyd-root/0.0.3/assets/pwa-icon-180px.png`,
      type: 'image/png',
      sizes: '180x180',
    },
    {
      src: `${config.cdnUrl}modules/frank-lloyd-root/0.0.3/assets/pwa-icon-192px.png`,
      type: 'image/png',
      sizes: '192x192',
    },
    {
      src: `${config.cdnUrl}modules/frank-lloyd-root/0.0.3/assets/pwa-icon-512px.png`,
      type: 'image/png',
      sizes: '512x512',
    },
  ],
});

export default {
  serviceWorker: true,
  scope: '/',
  webManifest,
};
