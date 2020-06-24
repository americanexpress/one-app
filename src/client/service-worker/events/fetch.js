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

import {
  appShell,
  cacheRouter,
  expiration,
  createMiddleware,
  createCacheName,
} from '@americanexpress/one-service-worker';

import { OFFLINE_CACHE_NAME } from '../constants';
import { createResourceMetaData, fetchCacheResource } from './utility';

function createAppCachingMiddleware(oneAppVersion) {
  return function appResourceCachingMiddleware(event, context) {
    if (event.request.url.includes(oneAppVersion)) {
      const [baseAppUrl] = event.request.url.split(oneAppVersion);
      const meta = createResourceMetaData(
        event,
        ['app', `${baseAppUrl}${oneAppVersion}/`]
      );
      context.set('cacheName', meta.cacheName);
      context.set('request', event.request.clone());
      event.respondWith(fetchCacheResource(event, meta));
    }
  };
}

function createHolocronCachingMiddleware(holocronModuleMap) {
  const { clientCacheRevision, modules } = holocronModuleMap;
  const moduleNames = Object.keys(modules);
  const moduleEntries = moduleNames.map((name) => [name, modules[name].baseUrl]);

  return function holocronCachingMiddleware(event, context) {
    // TODO: optimize - revise algorithm for matching
    const matchingModule = moduleEntries
      .find(([, baseUrl]) => event.request.url.startsWith(baseUrl));

    if (matchingModule) {
      const meta = createResourceMetaData(
        event,
        matchingModule,
        clientCacheRevision
      );
      context.set('cacheName', meta.cacheName);
      context.set('request', event.request.clone());
      event.respondWith(fetchCacheResource(event, meta));
    }
  };
}

export default function createFetchMiddleware() {
  const oneAppVersion = process.env.ONE_APP_BUILD_VERSION;
  const holocronModuleMap = JSON.parse(process.env.HOLOCRON_MODULE_MAP);

  return createMiddleware([
    appShell({
      route: '/_/pwa/shell',
      cacheName: createCacheName(OFFLINE_CACHE_NAME),
    }),
    cacheRouter({
      match: /manifest\.webmanifest$/,
      cacheName: OFFLINE_CACHE_NAME,
    }),
    createHolocronCachingMiddleware(holocronModuleMap),
    createAppCachingMiddleware(oneAppVersion),
    expiration(),
  ]);
}
