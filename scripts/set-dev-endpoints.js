#!/usr/bin/env node

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

const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');

const { argv } = require('yargs');
const { rimrafSync } = require('rimraf');

const PATH_TO_ENDPOINTS = path.resolve(process.cwd(), argv.path || argv._[0]);
const DEV_DIR = path.join(process.cwd(), '.dev');
const ENDPOINTS_DIR = path.join(DEV_DIR, 'endpoints');

const addDevFolder = () => {
  if (!fs.existsSync(DEV_DIR)) {
    fs.mkdirSync(DEV_DIR);
  }
};

const removeExistingEndpointsFile = () => {
  rimrafSync(ENDPOINTS_DIR);
};

const symlinkEndpointsFile = () => {
  if (!fs.existsSync(PATH_TO_ENDPOINTS)) {
    throw new Error(`${PATH_TO_ENDPOINTS} could not be found.`);
  }

  fs.mkdirSync(ENDPOINTS_DIR);
  if (os.platform() === 'win32') {
    fs.linkSync(PATH_TO_ENDPOINTS, `${ENDPOINTS_DIR}/index.js`);
  }

  fs.symlinkSync(PATH_TO_ENDPOINTS, `${ENDPOINTS_DIR}/index.js`);
};

const validateEndpointsFile = () => {
  // eslint-disable-next-line global-require,import/no-dynamic-require
  const endpoints = require(PATH_TO_ENDPOINTS)();
  assert(typeof endpoints === 'object', '`endpoints` must be an Object');
  Object.values(endpoints).forEach(({ destination, devProxyPath }) => {
    assert(typeof devProxyPath === 'string', '`devProxyPath` field in endpoints file must be defined and be a string');
    assert(typeof destination === 'string', '`destination` field in endpoints file must be defined and be a string');
  });
};

try {
  validateEndpointsFile();
  addDevFolder();
  removeExistingEndpointsFile();
  symlinkEndpointsFile();
  console.log('Successfully linked dev endpoints file to app');
} catch (error) {
  console.error(`Error:  Unable to link endpoints file to app.
    Reason: ${error}`);
}
