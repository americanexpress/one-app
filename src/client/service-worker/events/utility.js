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
  match, put, remove, getMetaData, setMetaData, createCacheName,
} from '@americanexpress/one-service-worker';

const localeRegExp = /(?<locale>([a-z]{2,3})(?:-)?([a-zA-Z]{1,})?)\/[^/]*\.json/;

export function createResourceMetaData(event, resourceInfo, revision) {
  const [name, baseUrl] = resourceInfo;
  const [version] = baseUrl.replace(/\/$/, '').split('/').reverse();
  const { request } = event;

  let type = name === 'app' ? 'one-app' : 'modules';

  let locale = null;
  if (localeRegExp.test(request.url)) {
    type = 'lang-packs';
    locale = request.url.match(localeRegExp).groups.locale;
  }

  let bundle = 'browser';
  if (request.url.includes('legacy')) {
    bundle = 'legacy';
  }

  const metaData = {
    bundle,
    type,
    name,
    version,
    path: request.url.replace(baseUrl, '').replace(/(.*)(\?[^/]*)$/, '$1'),
    url: request.url,
    cacheName: createCacheName(type),
  };

  if (revision) metaData.revision = revision;
  if (locale) metaData.locale = locale;

  return metaData;
}

export function markResourceForRemoval(cachedMetaRecord, newMetaRecord) {
  if (cachedMetaRecord.revision !== newMetaRecord.revision) return true;
  if (cachedMetaRecord.version !== newMetaRecord.version) return true;
  if (cachedMetaRecord.bundle !== newMetaRecord.bundle) return true;
  if (cachedMetaRecord.locale !== newMetaRecord.locale) return true;
  return false;
}

export function invalidateCacheResource(event, meta) {
  const [resourcePath] = meta.path.split('/').reverse();
  const resourceId = `${meta.type}/${meta.name}/${resourcePath}`;
  const resourceUrl = new Request(`/${resourceId}`).url;
  return (response) => {
    event.waitUntil(
      getMetaData({
        url: resourceUrl,
        cacheName: resourceId,
      }).then((cachedMeta) => {
        if (cachedMeta.url && markResourceForRemoval(cachedMeta, meta)) {
          event.waitUntil(
            remove(new Request(cachedMeta.url), { cacheName: meta.cacheName })
          );
        }
        return setMetaData({
          url: resourceUrl,
          cacheName: resourceId,
          metadata: meta,
        });
      })
    );
    return response;
  };
}

export function setCacheResource(event, meta) {
  return (response) => {
    event.waitUntil(
      put(event.request.clone(), response.clone(), {
        cacheName: meta.cacheName,
      })
    );
    return response;
  };
}

export function fetchCacheResource(event, meta) {
  return match(event.request.clone(), { cacheName: meta.cacheName })
    .then(
      (cachedResponse) => cachedResponse
      || fetch(event.request.clone()).then(setCacheResource(event, meta))
    )
    .then(invalidateCacheResource(event, meta));
}
