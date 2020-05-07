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
  expiration,
  cacheRouter,
  createMiddlewareContext,
  getMetaData,
  setMetaData,
  remove,
} from '@americanexpress/one-service-worker';

// The RegExp codex:
// - (?<capture-group-name>.*) for an exactly labeled object made from matching parts
// -> /(capture groups)/ of a string url. we can use `url.match(regExp).groups`to get
// -> all the named capture groups
// - /^https?(?::\/\/)/ start pattern anchors the start of the url and is not captured
// -> ( /(?:.*)/ ), only matched
// - specifying what we want to capture in (?<version>[^/]+[\d]+)
// -> we use /[^/]+/ to accurately capture what in between the slashes through negation ([^]).
// -> for each named capture, we want to get specific on what we expect that match to be.
// - we have a match-all in the center of the string (/https?(?::\/\/)HERE .* HERE\/(?<name>)/)
// -> because it allows us to ignore any matches before the url is
// -> matched from the end of the string and back
// - if you run across `/(?<name> .{1,5})\1/`, the `\1` matches what was first matched
// -> in a capture group. for this example: `name = \1`

// groups: name / version / resource . bundle ? revision
const moduleRegExp = /^https?(?::\/\/).*\/(?<name>[^/]+)\/(?<version>[^/]+[\d]+)\/(?<resource>([a-zA-Z-~]+|\1)(?:\.\1)?)(?:\.chunk)?\.(?<bundle>(legacy\.)?browser)\.js(?:\?clientCacheRevision=(?<revision>[^/&]*))?$/;
// groups: name / version / locale / resource
const langPackRegExp = /^https?(?::\/\/).*\/(?<name>[^/]+)\/(?<version>[^/]+[\d]+)(?:\/locale)?\/(?<locale>(?<language>[a-z]{2,3})(?:-)?(?<country>[a-zA-Z]{1,})?)\/(?<resource>(\1|[^/]*))\.json$/;
// groups: version / bundle / name
const oneAppRegExp = /^https?(?::\/\/).*(?:\/_\/static)?\/app\/(?<version>[^/]+[\d]+)?\/(?:(?<bundle>legacy)\/)?(?:i18n\/)?(?<name>[^/]+)\.js$/;

// - we compare the metadata between two resources in cache,
// -> depending on the rules that we want, we can use the meta-data
// -> between two requests occupying the same meta record entry name
// -> (eg `/${meta.type}/${meta.resource || meta.name}`)

function markForRemoval(cachedMetaRecord, newMetaRecord) {
  // on any change to the clientCacheRevision, we remove
  if (cachedMetaRecord.revision !== newMetaRecord.revision) return true;
  if (cachedMetaRecord.version !== newMetaRecord.version) return true;
  if (cachedMetaRecord.bundle !== newMetaRecord.bundle) return true;
  if (cachedMetaRecord.locale !== newMetaRecord.locale) return false;
  return false;
}

// - using the RegExps, we extract the metadata from the url and adding
// -> { meta } to the middleware stack context - but only on matching one
// -> of the three types.

function createFetchContext(event) {
  const { request: { url } } = event;
  let meta = null;

  [['module', moduleRegExp], ['lang-pack', langPackRegExp], ['one-app', oneAppRegExp]].forEach(([type, regExp]) => {
    if (regExp.test(url)) {
      meta = { type, ...url.match(regExp).groups };
      if (type !== 'lang-pack' && !meta.bundle) meta.bundle = 'browser';
      if (type === 'module' && !meta.revision) delete meta.revision;
    }
  });
  return meta && { meta };
}

function invalidationMiddleware(event, context) {
  // request and cacheName come from cacheRouter middleware if they match their target
  // meta is supplied on context creation
  const { request, cacheName, meta: resourceInfo } = context.get();
  // on match, the cacheRouter will add the event.request to the context
  // expiration middleware also behaves the same and only reacts if request is in context
  if (request && request instanceof Request) {
    const { url } = request;
    const { type, ...info } = resourceInfo;

    // filters out by type and resource/name
    // for modules and chunks to co-exist, we use info.resource
    const resourceKey = new Request(`/${type}/${info.resource || info.name}`).url;
    const resourceMeta = {
      ...info,
      type,
      url,
    };

    // we write the meta data extracted from the url and write a record for each resource
    // if a resource matches (by type and name) but differs in version (or revision, bundle type)
    // it will delete the variant
    event.waitUntil(
      getMetaData({
        url: resourceKey,
        cacheName,
      }).then((meta) => {
        if (meta.url && markForRemoval(meta, resourceMeta)) {
          event.waitUntil(remove(new Request(meta.url), { cacheName }));
        }
        return setMetaData({
          url: resourceKey,
          cacheName,
          metadata: resourceMeta,
        });
      })
    );
  }
}

// eslint-disable-next-line import/prefer-default-export
export function createCachingMiddleware() {
  const oneAppVersion = process.env.ONE_APP_BUILD_VERSION.replace(/(\.)/g, '\\.');
  const oneAppPattern = new RegExp(oneAppRegExp.source.replace('\\/app\\/(.*)\\/', `\\/app\\/${oneAppVersion}\\/`));
  const middlewareStack = [
    {
      cacheName: 'one-app-cache',
      match: oneAppPattern,
    },
    {
      cacheName: 'module-cache',
      match: moduleRegExp,
    },
    {
      cacheName: 'lang-pack-cache',
      match: langPackRegExp,
    },
  ].map(cacheRouter).concat([
    expiration(),
    invalidationMiddleware,
  ]);

  return function fetchMiddlewareStack(event) {
    const context = createMiddlewareContext(createFetchContext(event));
    middlewareStack.forEach((middleware) => middleware(event, context));
  };
}
