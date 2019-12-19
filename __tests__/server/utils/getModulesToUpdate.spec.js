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

import getModulesToUpdate from '../../../src/server/utils/getModulesToUpdate';

jest.mock('../../../src/server/utils/stateConfig', () => ({
  getServerStateConfig: jest.fn(() => ({
    rootModuleName: 'test-root',
  })),
}));
jest.mock('../../../src/server/utils/onModuleLoad', () => ({
  getModulesUsingExternals: jest.fn(() => ['first-module', 'another-module']),
}));

const current = {
  'first-module': {
    node: {
      url: 'https://example.com/cdn/first-module/1.0.0/first-module.node.js',
      integrity: '123',
    },
    browser: {
      url: 'https://example.com/cdn/first-module/1.0.0/first-module.browser.js',
      integrity: '87ry',
    },
    legacyBrowser: {
      url: 'https://example.com/cdn/first-module/1.0.0/first-module.legacy.browser.js',
      integrity: 'bfft75',
    },
  },
  'second-module': {
    node: {
      url: 'https://example.com/cdn/second-module/1.1.0/second-module.node.js',
      integrity: '2etrs34',
    },
    browser: {
      url: 'https://example.com/cdn/second-module/1.1.0/second-module.browser.js',
      integrity: 'hret54',
    },
    legacyBrowser: {
      url: 'https://example.com/cdn/second-module/1.1.0/second-module.legacy.browser.js',
      integrity: '232er',
    },
  },
  'third-module': {
    node: {
      url: 'https://example.com/cdn/third-module/1.1.1/third-module.node.js',
      integrity: 'hg54',
    },
    browser: {
      url: 'https://example.com/cdn/third-module/1.1.1/third-module.browser.js',
      integrity: '25rsr4',
    },
    legacyBrowser: {
      url: 'https://example.com/cdn/third-module/1.1.1/third-module.legacy.browser.js',
      integrity: '7858,g6',
    },
  },
  'another-module': {
    node: {
      url: 'https://example.com/cdn/another-module/2.0.0/another-module.node.js',
      integrity: '12wrsd',
    },
    browser: {
      url: 'https://example.com/cdn/another-module/2.0.0/another-module.browser.js',
      integrity: 'dgbftr434',
    },
    legacyBrowser: {
      url: 'https://example.com/cdn/another-module/2.0.0/another-module.legacy.browser.js',
      integrity: '64yvf3-1',
    },
  },
  'test-root': {
    node: {
      url: 'https://example.com/cdn/test-root/2.2.0/test-root.node.js',
      integrity: '23rdg3nrth',
    },
    browser: {
      url: 'https://example.com/cdn/test-root/2.2.0/test-root.browser.js',
      integrity: 'sed3hf',
    },
    legacyBrowser: {
      url: 'https://example.com/cdn/test-root/2.2.0/test-root.legacy.browser.js',
      integrity: 'dsg3e5y',
    },
  },
};

describe('getModulesToUpdate', () => {
  it('should include any module whose version has changed', () => {
    const next = {
      ...current,
      'second-module': {
        node: {
          url: 'https://example.com/cdn/second-module/3.0.0/second-module.node.js',
          integrity: '3q4dg',
        },
        browser: {
          url: 'https://example.com/cdn/second-module/3.0.0/second-module.browser.js',
          integrity: 'kjlil56',
        },
        legacyBrowser: {
          url: 'https://example.com/cdn/second-module/3.0.0/second-module.legacy.browser.js',
          integrity: '12323g',
        },
      },
      'third-module': {
        node: {
          url: 'https://example.com/cdn/third-module/1.1.2/third-module.node.js',
          integrity: '243e4dgs',
        },
        browser: {
          url: 'https://example.com/cdn/third-module/1.1.2/third-module.browser.js',
          integrity: '6456d54',
        },
        legacyBrowser: {
          url: 'https://example.com/cdn/third-module/1.1.2/third-module.legacy.browser.js',
          integrity: 'aabher',
        },
      },
    };
    expect(getModulesToUpdate(current, next)).toEqual(['second-module', 'third-module']);
  });

  it('should include all modules that use externals if the root module is updated', () => {
    const next = {
      ...current,
      'test-root': {
        node: {
          url: 'https://example.com/cdn/test-root/2.2.2/test-root.node.js',
          integrity: '4y45hr',
        },
        browser: {
          url: 'https://example.com/cdn/test-root/2.2.2/test-root.browser.js',
          integrity: 'nggdfhr34',
        },
        legacyBrowser: {
          url: 'https://example.com/cdn/test-root/2.2.2/test-root.legacy.browser.js',
          integrity: '7567ee',
        },
      },
    };
    expect(getModulesToUpdate(current, next)).toEqual(['first-module', 'another-module', 'test-root']);
  });

  it('throws when the root module does not exists', () => {
    const next = {
      'first-module': {
        node: {
          url: 'https://example.com/cdn/first-module/1.0.2/first-module.node.js',
          integrity: '3r22g',
        },
        browser: {
          url: 'https://example.com/cdn/first-module/1.0.2/first-module.browser.js',
          integrity: 'fhn45j',
        },
        legacyBrowser: {
          url: 'https://example.com/cdn/first-module/1.0.2/first-module.legacy.browser.js',
          integrity: '123adsd',
        },
      },
    };
    expect(() => getModulesToUpdate(current, next)).toThrowErrorMatchingSnapshot();
  });

  it('works when there are no modules in current module map', () => {
    const next = {
      'test-root': {
        node: {
          url: 'https://example.com/cdn/test-root/2.2.2/test-root.node.js',
          integrity: '4y45hr',
        },
        browser: {
          url: 'https://example.com/cdn/test-root/2.2.2/test-root.browser.js',
          integrity: 'nggdfhr34',
        },
        legacyBrowser: {
          url: 'https://example.com/cdn/test-root/2.2.2/test-root.legacy.browser.js',
          integrity: '7567ee',
        },
      },
    };
    expect(getModulesToUpdate({}, next)).toEqual(['test-root']);
  });
});
