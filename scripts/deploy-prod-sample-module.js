#!/usr/bin/env node

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

const fs = require('fs-extra');
const path = require('path');
const { argv } = require('yargs');

const {
  sanitizeEnvVars,
  nginxOriginStaticsRootDir,
  npmInstall,
  npmProductionBuild,
  getGitSha,
} = require('./utils');

const {
  modulePath,
  skipBuild,
  skipInstall,
  bundleStaticsOrigin = 'https://sample-cdn.frank',
} = argv;

const sanitizedEnvVars = sanitizeEnvVars();
const nginxOriginStaticsModulesDir = path.resolve(nginxOriginStaticsRootDir, 'modules');
const originModuleMapPath = path.resolve(nginxOriginStaticsRootDir, 'module-map.json');

const getPreBuiltModuleInfo = (pathToModule) => {
  const pkgPath = path.resolve(pathToModule, 'package.json');
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { name: moduleName, version: moduleVersion } = require(pkgPath);

  const pathToBundleIntegrityManifest = path.resolve(`${pathToModule}/bundle.integrity.manifest.json`);
  // eslint-disable-next-line global-require,import/no-dynamic-require
  const integrityDigests = require(pathToBundleIntegrityManifest);

  return { moduleName, moduleVersion, integrityDigests };
};

const buildModule = async (pathToModule) => {
  const pkgPath = path.resolve(pathToModule, 'package.json');
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { name: moduleName, version: moduleVersion } = require(pkgPath);

  if (!skipInstall) {
    await npmInstall({
      directory: pathToModule,
      moduleName,
      moduleVersion,
      envVars: sanitizedEnvVars,
    });
  }

  await npmProductionBuild({
    directory: pathToModule,
    moduleName,
    moduleVersion,
    envVars: sanitizedEnvVars,
  });

  const pathToBundleIntegrityManifest = path.resolve(`${pathToModule}/bundle.integrity.manifest.json`);
  // eslint-disable-next-line global-require,import/no-dynamic-require
  const integrityDigests = require(pathToBundleIntegrityManifest);

  return {
    moduleName, moduleVersion, integrityDigests,
  };
};

const deployModuleToProdSampleCDN = async (pathToModule, moduleName) => {
  const pathToModuleBuildDir = path.resolve(`${pathToModule}/build/`);
  // use one app git commit sha to namespace modules
  const gitSha = getGitSha();
  const pathToOriginModuleStatics = path.resolve(`${nginxOriginStaticsModulesDir}/${gitSha}/${moduleName}`);
  await fs.ensureDir(pathToOriginModuleStatics);
  await fs.copy(pathToModuleBuildDir, pathToOriginModuleStatics, { overwrite: true });
  return pathToOriginModuleStatics;
};

const updateModuleMap = async ({ moduleName, moduleVersion, integrityDigests }) => {
  // eslint-disable-next-line global-require,import/no-dynamic-require
  const moduleMap = require(originModuleMapPath);
  console.log(`Updating module map for ${moduleName}@${moduleVersion}`);
  const gitSha = getGitSha();
  const moduleBundles = {
    browser: {
      url: `${bundleStaticsOrigin}/modules/${gitSha}/${moduleName}/${moduleVersion}/${moduleName}.browser.js`,
      integrity: integrityDigests.browser,
    },
    legacyBrowser: {
      url: `${bundleStaticsOrigin}/modules/${gitSha}/${moduleName}/${moduleVersion}/${moduleName}.legacy.browser.js`,
      integrity: integrityDigests.legacyBrowser,
    },
    node: {
      url: `${bundleStaticsOrigin}/modules/${gitSha}/${moduleName}/${moduleVersion}/${moduleName}.node.js`,
      integrity: integrityDigests.node,
    },
  };
  moduleMap.modules[moduleName] = moduleBundles;
  fs.writeFile(originModuleMapPath, JSON.stringify(moduleMap, null, 2));
};

const deployModule = async () => {
  console.time('Deploying module', modulePath);
  const moduleInfo = skipBuild ? getPreBuiltModuleInfo(modulePath) : await buildModule(modulePath);
  await deployModuleToProdSampleCDN(modulePath, moduleInfo.moduleName);
  await updateModuleMap(moduleInfo);
  console.timeEnd('Deploying module', modulePath);
};

deployModule();
