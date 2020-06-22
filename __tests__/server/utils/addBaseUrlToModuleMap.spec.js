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

import addBaseUrlToModuleMap from '../../../src/server/utils/addBaseUrlToModuleMap';

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

describe('addBaseUrlToModuleMap', () => {
  it('creates a "baseUrl" entry for each module and returns a module map including the new key', () => {
    const updatedModuleMap = addBaseUrlToModuleMap(moduleMap);
    Object.keys(updatedModuleMap.modules).forEach((moduleName) => {
      const module = updatedModuleMap.modules[moduleName];
      expect(module.baseUrl).toBe(`https://example.com/cdn/${moduleName}/1.0.0/`);
    });
  });

  it('does not override the baseUrl key if already present in the module map', () => {
    const moduleMapWithBaseUrl = {
      ...moduleMap,
      modules: {
        ...moduleMap.modules,
        'module-a': {
          ...moduleMap.modules['module-a'],
          baseUrl: 'https://example.com/languages/module-a/1.0.0/',
        },
      },
    };
    const updatedModuleMap = addBaseUrlToModuleMap(moduleMapWithBaseUrl);
    const moduleA = updatedModuleMap.modules['module-a'];
    const moduleB = updatedModuleMap.modules['module-b'];
    expect(moduleA.baseUrl).toBe('https://example.com/languages/module-a/1.0.0/');
    expect(moduleB.baseUrl).toBe('https://example.com/cdn/module-b/1.0.0/');
  });
});
