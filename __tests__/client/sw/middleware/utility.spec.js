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
  getConfig,
  getResourceTypeFromCacheName,
  getClientCacheRevisionFromUrl,
  getLangPackInfoFromUrl,
  getModuleInfoFromUrl,
  getAppInfoFromUrl,
  markForRemoval,
} from '../../../../src/client/sw/middleware/utility';

function createSampleResourceUrl({
  bundleStaticsOrigin = 'https://example.com',
  checksum = '9a1df03d',
  moduleName = 'my-module',
  moduleVersion = '1.24.5',
  bundleType = '.browser',
  langPack = false,
  revision = false,
} = {}) {
  return [
    `${bundleStaticsOrigin}/modules/${checksum}/${moduleName}/${moduleVersion}/`,
    langPack ? `${langPack}/${moduleName}.json` : `${moduleName}${bundleType}.js`,
    revision ? '?clientCacheRevision=als2321c32mln21l4' : '',
  ].join('');
}

describe('getConfig', () => {
  test('returns empty object if configuration is not set', () => {
    expect.assertions(1);
    expect(getConfig()).toEqual({});
  });

  test('gets the current configuration from env', () => {
    expect.assertions(1);
    const config = { buildVersion: '5.0.0' };
    process.env.OSW_CONFIG = JSON.stringify(config);
    expect(getConfig()).toEqual(config);
  });
});

describe('getResourceTypeFromCacheName', () => {
  const oneAppCacheName = '__sw/one-app-cache';
  const moduleCacheName = '__sw/nested-path/module-cache';
  const langPackCacheName = 'language-pack-cache';

  test('returns empty string if no parameters given', () => {
    expect.assertions(1);
    expect(getResourceTypeFromCacheName()).toEqual('');
  });

  test('returns "one-app" from cache name', () => {
    expect.assertions(1);
    expect(getResourceTypeFromCacheName(oneAppCacheName)).toEqual('one-app');
  });

  test('returns "module" from cache name with nested prefix', () => {
    expect.assertions(1);
    expect(getResourceTypeFromCacheName(moduleCacheName)).toEqual('module');
  });

  test('returns "language-pack" from cache name without prefix', () => {
    expect.assertions(1);
    expect(getResourceTypeFromCacheName(langPackCacheName)).toEqual('language-pack');
  });
});

describe('getClientCacheRevisionFromUrl', () => {
  const revision = 'abc123';

  test('returns empty string if no parameters given', () => {
    expect.assertions(2);
    expect(getClientCacheRevisionFromUrl()).not.toEqual(revision);
    expect(getClientCacheRevisionFromUrl()).toEqual('');
  });

  test('returns empty string if no match', () => {
    expect.assertions(2);
    const url = '';
    expect(getClientCacheRevisionFromUrl(url)).not.toEqual(revision);
    expect(getClientCacheRevisionFromUrl()).toEqual(url);
  });

  test('returns the key value from the resource url', () => {
    expect.assertions(1);
    const url = `https://cdn.example.com/static/modules/my-module/1.20.3-12/my-module.browser.js?clientCacheRevision=${revision}`;
    expect(getClientCacheRevisionFromUrl(url)).toEqual(revision);
  });
});

describe('getLangPackInfoFromUrl', () => {
  test('does not match without parameters', () => {
    expect.assertions(1);
    expect(getLangPackInfoFromUrl()).toEqual({});
  });

  test('gets lang pack information from url', () => {
    expect.assertions(3);
    const moduleName = 'happy-frank';
    const moduleVersion = '0.0.5';
    expect(getLangPackInfoFromUrl(
      createSampleResourceUrl({
        moduleName,
        moduleVersion,
        langPack: 'en-US',
      })
    )).toMatchObject({
      name: moduleName,
      version: moduleVersion,
      locale: 'en-US',
      language: 'en',
      country: 'US',
      env: moduleName,
    });
    expect(getLangPackInfoFromUrl(
      createSampleResourceUrl({
        moduleName,
        moduleVersion,
        langPack: 'bem-ZM',
      })
    )).toMatchObject({
      name: moduleName,
      version: moduleVersion,
      locale: 'bem-ZM',
      language: 'bem',
      country: 'ZM',
      env: moduleName,
    });
    expect(getLangPackInfoFromUrl(
      createSampleResourceUrl({
        moduleName,
        moduleVersion,
        langPack: 'yav-CM',
      })
    )).toMatchObject({
      name: moduleName,
      version: moduleVersion,
      locale: 'yav-CM',
      language: 'yav',
      country: 'CM',
      env: moduleName,
    });
  });

  test('gets lang pack information from url suffix', () => {
    expect.assertions(1);
    const url = 'https://pwa.example.com/happy-frank/0.0.5/en-US/integration.json';
    expect(getLangPackInfoFromUrl(url)).toMatchObject({
      name: 'happy-frank',
      version: '0.0.5',
      language: 'en',
      country: 'US',
      env: 'integration',
    });
  });

  test('returns empty object if no match', () => {
    expect.assertions(1);
    const incorrectUrl = 'http://pwa.example.com/cdn/happy-frank/integration.json';
    expect(getLangPackInfoFromUrl(incorrectUrl)).toEqual({});
  });

  test('does not match module url', () => {
    expect.assertions(1);
    const moduleUrl = createSampleResourceUrl({
      moduleName: 'happy-frank',
      moduleVersion: '0.0.5',
    });
    expect(getLangPackInfoFromUrl(moduleUrl)).toEqual({});
  });
});

describe('getModuleInfoFromUrl', () => {
  test('does not match without parameters', () => {
    expect.assertions(1);
    expect(getModuleInfoFromUrl()).toEqual({});
  });

  test('gets module information from url', () => {
    expect.assertions(1);
    const url = createSampleResourceUrl();
    expect(getModuleInfoFromUrl(url)).toMatchObject({
      checksum: '9a1df03d',
      name: 'my-module',
      version: '1.24.5',
      bundle: 'browser',
      revision: undefined,
    });
  });

  test('gets legacy module information from url', () => {
    expect.assertions(1);
    const url = 'https://pwa.example.com/cdn/modules/0a87sf89/happy-frank/0.0.5/happy-frank.legacy.browser.js';
    expect(getModuleInfoFromUrl(url)).toMatchObject({
      checksum: '0a87sf89',
      name: 'happy-frank',
      version: '0.0.5',
      bundle: 'legacy.browser',
      revision: undefined,
    });
  });

  test('returns urlWithKey from legacy module url', () => {
    expect.assertions(1);
    const url = 'https://pwa.example.com/cdn/modules/0a87sf89/happy-frank/0.0.5/happy-frank.legacy.browser.js';
    const urlWithKey = `${url}?clientCacheRevision=keyValue`;
    expect(getModuleInfoFromUrl(urlWithKey)).toMatchObject({
      checksum: '0a87sf89',
      name: 'happy-frank',
      version: '0.0.5',
      bundle: 'legacy.browser',
      revision: 'keyValue',
    });
  });

  test('returns empty object if no match', () => {
    expect.assertions(1);
    const incorrectUrl = 'https://pwa.example.com/cdn/happy-frank.browser.js';
    expect(getModuleInfoFromUrl(incorrectUrl)).toMatchObject({});
  });
});

describe('getAppInfoFromUrl', () => {
  test('does not match without parameters', () => {
    expect.assertions(1);
    expect(getAppInfoFromUrl()).toEqual({});
  });

  test('gets app information from url', () => {
    expect.assertions(1);
    const url = 'https://pwa.example.com/_/static/app/5.0.0-3/app.js';
    expect(getAppInfoFromUrl(url)).toMatchObject({
      name: 'app',
      version: '5.0.0-3',
    });
  });

  test('returns empty object if no match', () => {
    expect.assertions(1);
    const incorrectUrl = 'https://pwa.example.com/cdn/app.js';
    expect(getAppInfoFromUrl(incorrectUrl)).toEqual({});
  });
});

describe('markForRemoval', () => {
  const type = 'module';
  const name = 'my-module';
  const version = '1.0.0.4';
  // specific to lang packs
  const locale = 'en-US';
  const meta = {
    type,
    name,
    version,
    locale,
  };

  test('returns false if revisions are not the same', () => {
    expect.assertions(1);
    const newRecord = { ...meta, revision: 'abc' };
    const cachedRecord = { ...meta, revision: 'def' };
    const shouldRemove = markForRemoval(cachedRecord, newRecord);
    expect(shouldRemove).toBe(true);
  });

  test('returns false if modules are the same', () => {
    expect.assertions(1);
    const newRecord = meta;
    const cachedRecord = meta;
    const shouldRemove = markForRemoval(cachedRecord, newRecord);
    expect(shouldRemove).toBe(false);
  });

  test('returns false if modules have different names', () => {
    expect.assertions(1);
    const newRecord = { ...meta, name: 'different-module' };
    const cachedRecord = meta;
    const shouldRemove = markForRemoval(cachedRecord, newRecord);
    expect(shouldRemove).toBe(false);
  });

  test('returns true if modules have different versions', () => {
    expect.assertions(1);
    const newRecord = { ...meta, version: '1.0.0.4' };
    const cachedRecord = { ...meta, version: '1.0.0.3' };
    const shouldRemove = markForRemoval(cachedRecord, newRecord);
    expect(shouldRemove).toBe(true);
  });

  test('returns false if lang packs have different bcp 47 code', () => {
    expect.assertions(1);
    const newRecord = { ...meta, locale: 'es-MX' };
    const cachedRecord = { ...meta };
    const shouldRemove = markForRemoval(cachedRecord, newRecord);
    expect(shouldRemove).toBe(false);
  });
});
