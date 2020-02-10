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

const clientModuleMapCache = jest.requireActual('../clientModuleMapCache');

clientModuleMapCache.setClientModuleMapCache({
  key: '123',
  modules: {
    'test-root': {
      node: {
        url: 'https://example.com/cdn/test-root/2.2.2/test-root.node.js',
        integrity: '4y45hr',
      },
      browser: {
        url: 'https://example.com/cdn/test-root/2.2.2/test-root.browser.js',
        integrity: 'dhhfsdfwer',
      },
      legacyBrowser: {
        url: 'https://example.com/cdn/test-root/2.2.2/test-root.legacy.browser.js',
        integrity: '567ty',
      },
    },
    a: {
      node: {
        url: 'https://example.com/cdn/a/2.2.2/a.node.js',
        integrity: 'awefs',
      },
      browser: {
        url: 'https://example.com/cdn/a/2.2.2/a.browser.js',
        integrity: 'fhgnt543',
      },
      legacyBrowser: {
        url: 'https://example.com/cdn/a/2.2.2/a.legacy.browser.js',
        integrity: '7567ee',
      },
    },
    c: {
      node: {
        url: 'https://example.com/cdn/c/2.2.2/c.node.js',
        integrity: '3535eqr',
      },
      browser: {
        url: 'https://example.com/cdn/c/2.2.2/c.browser.js',
        integrity: '323egdsbf',
      },
      legacyBrowser: {
        url: 'https://example.com/cdn/c/2.2.2/c.legacy.browser.js',
        integrity: 'd8vdfdfv',
      },
    },
    b: {
      node: {
        url: 'https://example.com/cdn/b/2.2.2/b.node.js',
        integrity: '4y45hr',
      },
      browser: {
        url: 'https://example.com/cdn/b/2.2.2/b.browser.js',
        integrity: 'yhrtrhw3',
      },
      legacyBrowser: {
        url: 'https://example.com/cdn/b/2.2.2/b.legacy.browser.js',
        integrity: '7567ee',
      },
    },
  },
});

export const getClientModuleMapCache = jest.fn(clientModuleMapCache.getClientModuleMapCache);
export const setClientModuleMapCache = jest.fn(clientModuleMapCache.setClientModuleMapCache);
