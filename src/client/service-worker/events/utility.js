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

// language
const appLocaleRegExp = /i18n\/([^/]*)\.js$/;
const moduleLocaleRegExp = /([a-z]{2,3}(-[a-zA-Z]{1,})?)\/[^/]*\.json$/;
// url:
// matches the full url path in the first capture group and
// the search params in the second capture group
const clientCacheRevisionRegexp = /(.*)(\?[^/]*)$/;

export function getOneAppVersion() {
  return process.env.ONE_APP_BUILD_VERSION;
}

export function getHolocronModuleMap() {
  return JSON.parse(process.env.HOLOCRON_MODULE_MAP);
}

export function createResourceMetaData(event, resourceInfo) {
  const [name, baseUrl, revision] = resourceInfo;
  const [version] = baseUrl.replace(/\/$/, '').split('/').reverse();
  const { request } = event;

  let type = name === 'app' ? 'one-app' : 'modules';

  let path;
  let locale;
  if (moduleLocaleRegExp.test(request.url)) {
    type = 'lang-packs';
    [path, locale] = request.url.match(moduleLocaleRegExp);
  } else if (appLocaleRegExp.test(request.url)) {
    [path, locale] = request.url.match(appLocaleRegExp);
    // write over the intl resource to allow locale invalidation
    path = path.replace(locale, 'language');
<<<<<<< HEAD
  } else {
    // if not an i18n resource type, we only extract the base filename as the path
    // we remove the clientCacheRevision from the url if present
    path = request.url.replace(baseUrl, '').replace(clientCacheRevisionRegexp, '$1');
=======
  }

  let bundle = 'browser';
  if (legacyRegExp.test(request.url)) {
    bundle = 'legacy';
>>>>>>> fix(pwa/cache): invalidate app locale
  }

  const metaData = {
    // type can be one of ['one-app', 'modules', 'lang-packs']
    type,
    // name will be the module name for module resources (module, lang-pack)
    // and will be 'app' if it is a one-app resource
    name,
    // the version is the current version of any resource
    version,
    // path will be the base filename and is used to point the correct meta-data with a resource
    path,
    // url will be the original url requested, used to add/delete any resource
    url: request.url,
    // cacheName is the name of the cache storing the resource
    // it is used to match and put resources into the correct cache, and remove it when needed
    cacheName: createCacheName(type),
  };

  // optional meta data when applicable
  // revision will be included if the clientCacheRevision key is present in the url
  if (revision) metaData.revision = revision;
  // locale will be included when either a module language pack or one-app i18n file
  if (locale) metaData.locale = locale;

  return metaData;
}

export function markResourceForRemoval(cachedMetaRecord, newMetaRecord) {
  if (cachedMetaRecord.revision !== newMetaRecord.revision) return true;
  if (cachedMetaRecord.version !== newMetaRecord.version) return true;
  if (cachedMetaRecord.locale !== newMetaRecord.locale) return true;
  return false;
}

export function invalidateCacheResource(event, meta) {
  const [resourcePath] = meta.path.split('/').reverse();
  const cacheName = [meta.type, meta.name, resourcePath].join('/');
  return (response) => {
    event.waitUntil(
      getMetaData({
        cacheName,
      }).then((cachedMeta) => {
        if (cachedMeta.url && markResourceForRemoval(cachedMeta, meta)) {
          event.waitUntil(
            remove(new Request(cachedMeta.url), { cacheName: cachedMeta.cacheName })
          );
        }
        return setMetaData({
          cacheName,
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
