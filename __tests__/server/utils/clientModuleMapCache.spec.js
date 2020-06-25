/*
 * Copyright 2019 American Express Travel Related Services Company, Inc.
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

import { setClientModuleMapCache, getClientModuleMapCache } from '../../../src/server/utils/clientModuleMapCache';

const moduleMap = {
  modules: {
    'module-a': {
      node: {
        url: 'https://example.com/cdn/module-a/1.0.0/module-a.node.js',
        integrity: '234',
      },
      browser: {
        url: 'https://example.com/cdn/module-a/1.0.0/module-a.browser.js',
        integrity: '353',
      },
      legacyBrowser: {
        url: 'https://example.com/cdn/module-a/1.0.0/module-a.legacy.browser.js',
        integrity: '0087',
      },
    },
    'module-b': {
      node: {
        url: 'https://example.com/cdn/module-b/1.0.0/module-b.node.js',
        integrity: '0322380',
      },
      browser: {
        url: 'https://example.com/cdn/module-b/1.0.0/module-b.browser.js',
        integrity: 'sd3o23098',
      },
      legacyBrowser: {
        url: 'https://example.com/cdn/module-b/1.0.0/module-b.legacy.browser.js',
        integrity: 'flj23032',
      },
    },
  },
};

describe('clientModuleMapCache', () => {
  let moduleMapCache;
  const cacheKeys = ['browser', 'legacyBrowser'];

  beforeAll(() => {
    setClientModuleMapCache(moduleMap);
    moduleMapCache = getClientModuleMapCache();
  });

  it('creates a cache with separate entries for browser and legacyBrowser', () => {
    expect(Object.keys(moduleMapCache)).toEqual(cacheKeys);
  });

  it('creates a "baseUrl" entry for each module and returns a module map including the addition', () => {
    // conflicting eslint rules here
    // eslint-disable-next-line max-len
    cacheKeys.forEach((cacheKey) => Object.keys(moduleMapCache[cacheKey].modules).forEach((moduleName) => {
      const module = moduleMapCache[cacheKey].modules[moduleName];
      expect(module.baseUrl).toBe(`https://example.com/cdn/${moduleName}/1.0.0/`);
    })
    );
  });

  it('only includes values for a single bundle per module in each map', () => {
    // conflicting eslint rules here
    // eslint-disable-next-line max-len
    cacheKeys.forEach((cacheKey) => Object.keys(moduleMapCache[cacheKey].modules).forEach((moduleName) => {
      const module = moduleMapCache[cacheKey].modules[moduleName];
      expect(Object.keys(module)).toEqual(['baseUrl', cacheKey]);
      expect(module[cacheKey]).toEqual({
        url: `https://example.com/cdn/${moduleName}/1.0.0/${moduleName}.${cacheKey === 'browser' ? 'browser' : 'legacy.browser'}.js`,
        integrity: expect.any(String),
      });
    })
    );
  });
});
