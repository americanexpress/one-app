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

/* eslint-disable global-require */

export const defaultSplashScreen = 'http://localhost:3001/static/modules/frank-lloyd-root/0.0.3/assets/pwa-icon-512px.png';
export const defaultIcon = 'http://localhost:3001/static/modules/frank-lloyd-root/0.0.3/assets/pwa-icon-192px.png';
export const appleIcon = 'http://localhost:3001/static/modules/frank-lloyd-root/0.0.3/assets/pwa-icon-180px.png';

export const scope = '/';
// eslint-disable-next-line camelcase
export const start_url = '/success';
// eslint-disable-next-line camelcase
export const theme_color = '#FDB92D';

export default {
  enabled: true,
  scope,
  manifest: {
    scope,
    start_url,
    name: 'Frank Lloyd Root',
    short_name: 'frank lloyd root',
    display: 'standalone',
    theme_color,
    background_color: '#FFF',
    icons: [
      {
        src: appleIcon,
        type: 'image/png',
        sizes: '180x180',
      },
      {
        src: defaultIcon,
        type: 'image/png',
        sizes: '192x192',
      },
      {
        src: defaultSplashScreen,
        type: 'image/png',
        sizes: '512x512',
      },
    ],
  },
};
