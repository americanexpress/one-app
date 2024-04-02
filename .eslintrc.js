/*
 * Copyright (c) 2024 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

const allowedDangles = [
  // one-app
  '__INITIAL_STATE__',
  '__render_mode__',
  // holocron
  '__CLIENT_HOLOCRON_MODULE_MAP__',
  '__HOLOCRON_EXTERNALS__',
  // redux
  '__REDUX_DEVTOOLS_EXTENSION_COMPOSE__',
  // prom-client
  '_metrics',
  // lean-intl
  '__addLocaleData',
  // webpack
  '__webpack_public_path__',
];

module.exports = {
  root: true,
  extends: 'amex',
  plugins: ['es'],
  parserOptions: {
    babelOptions: {
      presets: ['@babel/preset-react'],
    },
  },
  rules: {
    'unicorn/prefer-node-protocol': 'error',
    'eslint-comments/require-description': ['error', { ignore: ['eslint-enable'] }],
    'no-underscore-dangle': ['error', { allow: allowedDangles }],
    'default-param-last': 0,
  },
  overrides: [
    {
      files: ['__performance__/**'],
      globals: {
        __ENV: true,
      },
      rules: {
        // These scripts are not run directly, and the k6 package is a placeholder
        'import/no-unresolved': ['error', { ignore: ['k6'] }],
      },
    },
    {
      files: [
        '**/__mocks__/**',
        '**/__tests__/**',
      ],
      extends: 'amex/test',
      rules: {
        // a lot of tests require changing the environment the file is started in
        'global-require': 0,
        // this is a server, a lot of console spies are added
        'no-console': 0,
        'no-underscore-dangle': ['error', { allow: allowedDangles }],
      },
    },
    {
      files: ['src/server/**'],
      rules: {
        // console methods are how we log events
        'no-console': 0,
      },
    },
    {
      files: [
        // Parts of the server that are only used in development
        'src/server/devHolocronCDN.js',
        'src/server/utils/devCdnFactory.js',
        'src/server/utils/watchLocalModules.js',
        'src/server/utils/logging/config/development.js',
        // Client service worker just needs `@americanexpress/one-service-worker` at build time
        'src/client/service-worker/**',
      ],
      rules: {
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      },
    },
    {
      files: ['src/client/service-worker/**'],
      rules: {
        // for clearer error reporting, having anonymous functions may inhibit us from
        // collecting a concise stack trace with the proper names of invoked functions
        'prefer-arrow-callback': 'off',
        // generally, self is acceptable to use in a service worker script
        // we want to allow this behavior throughout
        'no-restricted-globals': ['off', 'self'],
      },
    },
    {
      // Allow console logs in documentation
      files: ['**/*.md/*.{js,javascript,jsx,node}'],
      rules: {
        'no-console': 0,
      },
    },
    {
      files: ['prod-sample/**'],
      rules: {
        'import/no-unresolved': 'off',
      },
    },
    {
      files: ['prod-sample/sample-modules/**'],
      rules: {
        'react/no-unknown-property': ['error', { ignore: ['css'] }],
      },
    },
    {
      files: [
        'scripts/**',
        'one-app-statics/**',
      ],
      rules: {
        // these scripts should be used only during development
        'import/no-extraneous-dependencies': ['error', { devDependencies: true, optionalDependencies: true, peerDependencies: false }],
        // we need to message the user for DX
        'no-console': 'off',
        'global-require': 'off',
        'import/no-dynamic-require': 'off',
      },
    },
    {
      files: ['scripts/dangers/**'],
      globals: {
        danger: 'readonly',
        fail: 'readonly',
        markdown: 'readonly',
        message: 'readonly',
        peril: 'readonly',
        schedule: 'readonly',
        warn: 'readonly',
      },
    },
  ],
};
