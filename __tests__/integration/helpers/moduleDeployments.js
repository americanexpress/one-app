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

const { resolve } = require('path');
const fs = require('fs-extra');
const { retrieveGitSha } = require('./moduleMap');

const modulesLocation = resolve(__dirname, '../../../prod-sample/nginx/origin-statics/modules');

const deployBrokenModule = async ({ moduleName, version }) => {
  const gitSha = await retrieveGitSha();
  const moduleBuildPath = resolve(modulesLocation, gitSha, moduleName, version);
  fs.ensureDirSync(moduleBuildPath);

  const browserBuildPath = resolve(moduleBuildPath, `${moduleName}.browser.js`);
  const serverBuildPath = resolve(moduleBuildPath, `${moduleName}.node.js`);
  const legacyBrowserBuildPath = resolve(moduleBuildPath, `${moduleName}.legacy.browser.js`);

  fs.writeFileSync(browserBuildPath, "throw new Error('bad things will happen');", { flag: 'wx' });
  fs.writeFileSync(serverBuildPath, "throw new Error('bad things will happen');", { flag: 'wx' });
  fs.writeFileSync(legacyBrowserBuildPath, "throw new Error('bad things will happen');", { flag: 'wx' });
};

const dropModuleVersion = async ({ moduleName, version }) => {
  const gitSha = await retrieveGitSha();
  const moduleBuildPath = resolve(modulesLocation, gitSha, moduleName, version);
  fs.removeSync(moduleBuildPath);
};

const renameModule = async ({ moduleName, newModuleName }) => {
  const gitSha = await retrieveGitSha();
  const modulePath = resolve(modulesLocation, gitSha, moduleName);
  const newModulePath = resolve(modulesLocation, gitSha, newModuleName);
  fs.renameSync(modulePath, newModulePath);
};

module.exports = {
  deployBrokenModule,
  dropModuleVersion,
  renameModule,
};
