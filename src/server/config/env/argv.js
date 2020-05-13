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

import yargs, { argv } from 'yargs';
import path from 'path';

const rootModuleNameEnvVarValue = process.env.ONE_CLIENT_ROOT_MODULE_NAME;

if (process.env.NODE_ENV === 'development') {
  yargs
    .option('m', {
      alias: 'use-middleware',
      describe: 'Apply a custom middleware configuration for one-app-dev-proxy',
      type: 'boolean',
    })
    .option('root-module-name', {
      describe: 'Name of the module that serves as the entry point to your application.',
      type: 'string',
    })
    .option('module-map-url', {
      describe: 'Remote module map URL for one-app-dev-cdn to proxy',
      type: 'string',
    })
    .option('use-host', {
      describe: 'use req.headers.host instead of localhost for one-app-dev-cdn',
      default: false,
      type: 'boolean',
    });

  // only require a remote module map if there are no locally served modules
  let isLocalModuleMapEmpty = false;
  try {
    // eslint-disable-next-line import/no-dynamic-require,global-require
    const localModuleMap = require(path.join(process.cwd(), 'static', 'module-map.json'));
    if (Object.entries(localModuleMap).length === 0) {
      isLocalModuleMapEmpty = true;
    }
  // if local module map is an empty file we need to catch it
  } catch (error) {
    isLocalModuleMapEmpty = true;
  }

  if (isLocalModuleMapEmpty) {
    if (!rootModuleNameEnvVarValue) {
      yargs.demandOption(
        ['module-map-url', 'root-module-name'],
        'Both `root-module-name` and `module-map-url` args are required if there are no locally served modules.'
      );
    } else {
      yargs.demandOption(
        ['module-map-url'],
        '`module-map-url` is required if there are no locally served modules.'
      );
    }
  } else if (!rootModuleNameEnvVarValue) {
    yargs.demandOption(
      ['root-module-name'],
      '`root-module-name` is a required arg.'
    );
  }
}

yargs
  .option('log-format', {
    describe: 'Presentation of log entries',
    type: 'string',
    choices: ['friendly', 'verbose', 'machine'],
    default: process.env.NODE_ENV === 'development' ? 'friendly' : 'machine',
  })
  .option('log-level', {
    describe: 'Lowest level of log entries to show',
    type: 'string',
    choices: ['error', 'warn', 'log', 'info'],
    default: process.env.NODE_ENV === 'development' ? 'log' : 'info',
  });

if (argv.rootModuleName && rootModuleNameEnvVarValue) {
  throw new Error(
    'Both the `root-module-name` argument and the `ONE_CLIENT_ROOT_MODULE_NAME` environment variable have been provided, but only one may be set at once.\n'
  );
}
