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

// eslint-disable-next-line import/no-extraneous-dependencies
import {
  isCacheStorageSupported,
  isServiceWorker,
  getMetaData,
  setMetaData,
  remove,
} from '@americanexpress/one-service-worker';

import {
  getResourceTypeFromCacheName, getModuleInfoFromUrl, getLangPackInfoFromUrl, markForRemoval,
} from './utility';

export default function createInvalidationMiddleware() {
  if (!isCacheStorageSupported() || !isServiceWorker()) return function noop() {};

  return function invalidationMiddleware(event, context) {
    const { request, cacheName } = context.get();

    if (request && request instanceof Request) {
      const { url } = request;

      const type = getResourceTypeFromCacheName(cacheName);

      let info = {};

      switch (type) {
        case 'one-app':
          info = getLangPackInfoFromUrl(url);
          break;
        case 'module':
          info = getModuleInfoFromUrl(url);
          break;
        case 'language-pack':
          info = getLangPackInfoFromUrl(url);
          break;
        default:
          break;
      }

      const resourceKey = new Request(`/${type}/${info.name}`).url;
      const resourceMeta = {
        ...info,
        type,
        url,
      };

      event.waitUntil(
        getMetaData({
          url: resourceKey,
        }).then((meta) => {
          if (markForRemoval(meta, resourceMeta)) {
            event.waitUntil(remove(new Request(meta.url)));
          }

          return setMetaData({
            url: resourceKey,
            metadata: resourceMeta,
          });
        })
      );
    }
  };
}
