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
  it('creates a cache with separate entries for browser and legacyBrowser', () => {
    setClientModuleMapCache(moduleMap);
    expect(Object.keys(getClientModuleMapCache())).toEqual(['browser', 'legacyBrowser']);
  });

  it('allows some bundles to not exist for some modules', () => {
    setClientModuleMapCache({
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
        },
        'module-b': {
          node: {
            url: 'https://example.com/cdn/module-b/1.0.0/module-b.node.js',
            integrity: '0322380',
          },
          legacyBrowser: {
            url: 'https://example.com/cdn/module-b/1.0.0/module-b.legacy.browser.js',
            integrity: 'flj23032',
          },
        },
        'module-c': {
          browser: {
            url: 'https://example.com/cdn/module-a/1.0.0/module-a.browser.js',
            integrity: '353',
          },
          legacyBrowser: {
            url: 'https://example.com/cdn/module-a/1.0.0/module-a.legacy.browser.js',
            integrity: '0087',
          },
        },
      },
    });
    const moduleMapCache = getClientModuleMapCache();
    expect(moduleMapCache).toHaveProperty('browser');
    expect(moduleMapCache).toHaveProperty('browser.modules.module-a');
    expect(moduleMapCache).not.toHaveProperty('browser.modules.module-b');
    expect(moduleMapCache).toHaveProperty('browser.modules.module-c');
    expect(moduleMapCache).toHaveProperty('legacyBrowser');
    expect(moduleMapCache).not.toHaveProperty('legacyBrowser.modules.module-a');
    expect(moduleMapCache).toHaveProperty('legacyBrowser.modules.module-b');
    expect(moduleMapCache).toHaveProperty('legacyBrowser.modules.module-c');
  });

  it('only includes values for a single bundle per module in each map', () => {
    setClientModuleMapCache(moduleMap);
    const moduleMapCache = getClientModuleMapCache();

    const cacheKeys = ['browser', 'legacyBrowser'];
    cacheKeys.forEach((cacheKey) => Object
      .keys(moduleMapCache[cacheKey].modules)
      .forEach((moduleName) => {
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
