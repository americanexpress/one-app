/*
 * Copyright 2021 American Express Travel Related Services Company, Inc.
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

import { argv } from 'yargs';
import path from 'path';

function getLocalModuleMap() {
  const localModulePath = path.join(process.cwd(), 'static', 'module-map.json');
  try {
    // eslint-disable-next-line import/no-dynamic-require,global-require
    return require(localModulePath);
  } catch (e) {
    return 'no such path';
  }
}

const moduleMap = argv.moduleMapUrl || getLocalModuleMap();
const rootModuleName = process.env.ONE_CLIENT_ROOT_MODULE_NAME || argv.rootModuleName;

const environment = {
  NODE_ENV: process.env.NODE_ENV,
  rootModuleName,
  HOLOCRON_MODULE_MAP_URL: process.env.HOLOCRON_MODULE_MAP_URL,
  ONE_CLIENT_REPORTING_URL: process.env.ONE_CLIENT_REPORTING_URL,
  ONE_CLIENT_CSP_REPORTING_URL: process.env.ONE_CLIENT_CSP_REPORTING_URL,
  ONE_CLIENT_ROOT_MODULE_NAME: process.env.ONE_CLIENT_ROOT_MODULE_NAME,
  ONE_CLIENT_CDN_URL: process.env.ONE_CLIENT_CDN_URL,
  ONE_CONFIG_ENV: process.env.ONE_CONFIG_ENV,
  moduleMap,
  rootModuleNameDuplicate: Boolean(argv.rootModuleName && process.env.ONE_CLIENT_ROOT_MODULE_NAME),
};

export { environment as default };
