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

const ip = require('ip').address();
const { preprocessEnvVar } = require('@americanexpress/env-config-utils');
const isFetchableUrlInNode = require('@americanexpress/env-config-utils/isFetchableUrlInNode');
const isFetchableUrlInBrowser = require('@americanexpress/env-config-utils/isFetchableUrlInBrowser');
const { argv } = require('yargs');

const isPositiveIntegerIfDefined = (input) => {
  if (input === undefined) {
    return;
  }

  const value = Number(input);

  if (value > 0 && value % 1 === 0) {
    return;
  }

  throw new Error(`Expected ${input} to be a positive integer`);
};

// the set of env vars to validate and normalize
// order matters, ex: ONE_CLIENT_REPORTING_URL uses HTTP_PORT
const runTime = [
  {
    name: 'NODE_ENV',
    normalize: (input) => input && input.toLowerCase(),
    valid: ['development', 'production'],
    defaultValue: 'production',
  },
  // heapdump config
  {
    name: 'NODE_HEAPDUMP_OPTIONS',
    defaultValue: 'nosignal',
  },
  // IPv4 port to bind on
  {
    name: 'HTTP_PORT',
    normalize: (input) => {
      const parsed = parseInt(input, 10);
      // make sure the parsed value is the same value as input
      // input may be a string or a number, we don't want === in this case, just ==
      if (Number.isNaN(parsed) || parsed != input) { // eslint-disable-line eqeqeq
        throw new Error(`env var HTTP_PORT needs to be a valid integer, given "${input}"`);
      } else {
        return parsed;
      }
    },
    defaultValue: () => {
      if (process.env.PORT) { return process.env.PORT; }
      return 3000;
    },
  },
  // IPv4 port for the health and metrics server to bind on
  {
    name: 'HTTP_METRICS_PORT',
    normalize: (input) => {
      const parsed = parseInt(input, 10);
      // make sure the parsed value is the same value as input
      // input may be a string or a number, we don't want === in this case, just ==
      if (Number.isNaN(parsed) || parsed != input) { // eslint-disable-line eqeqeq
        throw new Error(`env var HTTP_METRICS_PORT needs to be a valid integer, given "${input}"`);
      } else {
        return parsed;
      }
    },
    defaultValue: () => 3005,
  },
  {
    name: 'HTTP_ONE_APP_DEV_CDN_PORT',
    normalize: (input) => {
      if (input) {
        const parsed = parseInt(input, 10);
        // make sure the parsed value is the same value as input
        // input may be a string or a number, we don't want === in this case, just ==
        if (Number.isNaN(parsed) || parsed != input) { // eslint-disable-line eqeqeq
          throw new Error(`env var HTTP_ONE_APP_DEV_CDN_PORT needs to be a valid integer, given "${input}"`);
        } else {
          return parsed;
        }
      }
      return undefined;
    },
    defaultValue: () => (process.env.NODE_ENV === 'development'
      ? 3001
      : undefined),
  },
  {
    name: 'HTTP_ONE_APP_DEV_PROXY_SERVER_PORT',
    normalize: (input) => {
      if (input) {
        const parsed = parseInt(input, 10);
        // make sure the parsed value is the same value as input
        // input may be a string or a number, we don't want === in this case, just ==
        if (Number.isNaN(parsed) || parsed != input) { // eslint-disable-line eqeqeq
          throw new Error(`env var HTTP_ONE_APP_DEV_PROXY_SERVER_PORT needs to be a valid integer, given "${input}"`);
        } else {
          return parsed;
        }
      }
      return undefined;
    },
    defaultValue: () => (process.env.NODE_ENV === 'development'
      ? 3002
      : undefined),
  },
  // holocron config, the modules to use
  {
    name: 'HOLOCRON_MODULE_MAP_URL',
    defaultValue: () => (process.env.NODE_ENV === 'development'
      ? `http://${ip}:${process.env.HTTP_ONE_APP_DEV_CDN_PORT}/static/module-map.json`
      : undefined),
    validate: isFetchableUrlInNode,
  },
  {
    name: 'HOLOCRON_SERVER_MAX_MODULES_RETRY',
    validate: isPositiveIntegerIfDefined,
  },
  {
    name: 'HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH',
    validate: isPositiveIntegerIfDefined,
  },
  // where to send/report client errors
  {
    name: 'ONE_CLIENT_REPORTING_URL',
    defaultValue: () => (process.env.NODE_ENV === 'development'
      ? `http://${ip}:${process.env.HTTP_PORT}/_/report/errors`
      : undefined),
    validate: isFetchableUrlInBrowser,
  },
  // where to send/report csp violations
  {
    name: 'ONE_CLIENT_CSP_REPORTING_URL',
    defaultValue: () => (process.env.NODE_ENV === 'development'
      ? `http://${ip}:${process.env.HTTP_PORT}/_/report/security/csp-violation`
      : undefined),
    validate: isFetchableUrlInBrowser,
  },
  // allow hosting of static assets externally
  {
    name: 'ONE_CLIENT_CDN_URL',
    defaultValue: () => (process.env.NODE_ENV === 'development'
      ? '/_/static/'
      : undefined),
    validate: (value) => {
      isFetchableUrlInBrowser(value);
      if (!/\/$/.test(value)) {
        throw new Error('ONE_CDN_URL must have a trailing slash');
      }
    },
  },
  // locale folder env level
  {
    name: 'ONE_CLIENT_LOCALE_FILENAME',
    valid: ['integration', 'qa', undefined],
    normalize: (input) => input || undefined,
    defaultValue: () => (process.env.NODE_ENV === 'development' ? 'integration' : undefined),
  },
  {
    name: 'ONE_CLIENT_ROOT_MODULE_NAME',
    validate: (value) => { if (!value) { throw new Error('The `ONE_CLIENT_ROOT_MODULE_NAME` environment variable must be defined.'); } },
    defaultValue: () => (process.env.NODE_ENV === 'development' ? argv.rootModuleName : undefined),
  },
  {
    name: 'ONE_REFERRER_POLICY_OVERRIDE',
    defaultValue: () => 'same-origin',
    validate: (value) => {
      const approvedPolicies = [
        'no-referrer',
        'no-referrer-when-downgrade',
        'same-origin',
        'strict-origin',
      ];

      if (!approvedPolicies.includes(value)) {
        throw new Error(`${value} in not an approved policy. Please use: ${approvedPolicies.join(',')}.`);
      }
    },
  },
];

runTime.forEach(preprocessEnvVar);
export { ip };
export default runTime;
