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

// usage: const cacheKeys = await browser.executeAsync(getCacheKeys);
exports.getCacheKeys = function getCacheKeys(done) {
  // eslint-disable-next-line prefer-arrow-callback
  caches.keys().then(function filterKeys(cacheKeys) {
    // eslint-disable-next-line prefer-arrow-callback
    return cacheKeys.filter(function filterSWCache(key) {
      return key.startsWith('__sw');
    });
  }).then(done);
};

// usage: const cacheEntries = await browser.executeAsync(getCacheEntries, cacheKeys);
// makes it easy to build maps - new Map(cacheEntries);
exports.getCacheEntries = function getCacheEntries(cacheKeys, done) {
  Promise.all(
    // we map over each cache name and open that cache to use it
    cacheKeys.map((key) => caches
      .open(key)
      // once we have the cache reference, we get all the keys (Request(s))
      .then((cache) => cache.keys().then((requests) => [
        // finally, we return an array for each cache (name) and every request url [url, ...]
        key,
        requests.map(({ url }) => url),
      ])
      )
    )
  ).then(done);
};

// usage: const match = await browser.executeAsync(getCacheMatch, 'https://...');
exports.getCacheMatch = function getCacheEntries(url, done) {
  caches.match(url).then(done);
};
