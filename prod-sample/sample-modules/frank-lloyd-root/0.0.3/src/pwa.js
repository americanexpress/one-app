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

const scope = '/';

export const webManifest = (config) => {
  const {
    cdnUrl = '', clientCdnUrl = '', remoteCdnUrl = '', themeColor, description,
  } = config;
  // if the cdnUrl starts with the remoteCdnUrl, we should rely on that for the base url
  const baseUrl = remoteCdnUrl.startsWith(cdnUrl) ? remoteCdnUrl : clientCdnUrl || cdnUrl;
  return {
    // like the service worker, we can set a scope which this manifest takes effect
    scope,
    // when loading an installed PWA, we can set the starting url on entry/load
    start_url: '/success',
    // a summary of what this app is about
    description,
    // name is used to identify the icon created for app installs (on any device)
    name: 'Frank Lloyd Root',
    // the short name is the same as name, except used if name is too long
    short_name: 'frank lloyd root',
    // UI options
    // the display sets the web view that a PWA is run in
    display: 'standalone',
    // background and theme colors are used with the native UI and splash screens
    // to control the colors used by each color respectively
    background_color: '#FFF',
    theme_color: themeColor,
    // icons allow us to add sizes for icons for various devices and the splash screen to use
    icons: [
      {
        src: `${baseUrl}modules/frank-lloyd-root/0.0.3/assets/pwa-icon-180px.png`,
        type: 'image/png',
        sizes: '180x180',
      },
      {
        src: `${baseUrl}modules/frank-lloyd-root/0.0.3/assets/pwa-icon-192px.png`,
        type: 'image/png',
        sizes: '192x192',
      },
      {
        src: `${baseUrl}modules/frank-lloyd-root/0.0.3/assets/pwa-splash-512px.png`,
        type: 'image/png',
        sizes: '512x512',
      },
    ],
  };
};

export default {
  serviceWorker: true,
  scope,
  webManifest,
};
