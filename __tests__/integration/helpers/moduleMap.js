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

const fs = require('fs-extra');
const { resolve, join } = require('path');
const util = require('node:util');
const childProcess = require('child_process');

const promisifiedExec = util.promisify(childProcess.exec);
const moduleMapPath = resolve(__dirname, '../../../prod-sample/nginx/origin-statics/module-map.json');
const sampleModulesPath = resolve(__dirname, '../../../prod-sample/sample-modules/');
const writeModuleMap = (moduleMap) => fs.writeFileSync(moduleMapPath, JSON.stringify(moduleMap));
const readModuleMap = () => JSON.parse(fs.readFileSync(moduleMapPath));
const testCdnUrl = 'https://sample-cdn.frank/modules';

const retrieveGitSha = async () => {
  const { stdout } = await promisifiedExec('git rev-parse --short HEAD');
  return stdout.trim();
};

const retrieveModuleIntegrityDigests = ({ moduleName, version }) => {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const integrityDigests = require(
    join(
      sampleModulesPath,
      moduleName,
      version.split('-')[0],
      'bundle.integrity.manifest.json'
    )
  );

  return integrityDigests;
};

const addModuleToModuleMap = async ({
  moduleName,
  version,
  integrityDigests = retrieveModuleIntegrityDigests({ moduleName, version }),
}) => {
  const gitSha = await retrieveGitSha();
  const moduleMap = readModuleMap();
  moduleMap.modules[moduleName] = {
    node: {
      url: `${testCdnUrl}/${gitSha}/${moduleName}/${version}/${moduleName}.node.js`,
      integrity: integrityDigests.node,
    },
    browser: {
      url: `${testCdnUrl}/${gitSha}/${moduleName}/${version}/${moduleName}.browser.js`,
      integrity: integrityDigests.browser,
    },
    legacyBrowser: {
      url: `${testCdnUrl}/${gitSha}/${moduleName}/${version}/${moduleName}.legacy.browser.js`,
      integrity: integrityDigests.legacyBrowser,
    },
  };
  writeModuleMap(moduleMap);
  return moduleMap;
};

const removeModuleFromModuleMap = (moduleName) => {
  const moduleMap = readModuleMap();
  delete moduleMap.modules[moduleName];
  writeModuleMap(moduleMap);
  return moduleMap;
};

module.exports = {
  retrieveGitSha,
  addModuleToModuleMap,
  removeModuleFromModuleMap,
  retrieveModuleIntegrityDigests,
  writeModuleMap,
  readModuleMap,
  testCdnUrl,
};
