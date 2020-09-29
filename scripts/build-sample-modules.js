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

const fs = require('fs-extra');
const path = require('path');
const { argv } = require('yargs');

const {
  sanitizeEnvVars,
  nginxOriginStaticsRootDir,
  sampleModulesDir,
  sampleProdDir,
  npmInstall,
  npmProductionBuild,
  getGitSha,
} = require('./utils');

const nginxOriginStaticsModulesDir = path.resolve(nginxOriginStaticsRootDir, 'modules');
const pathToNginxOriginModuleMap = path.resolve(nginxOriginStaticsRootDir, 'module-map.json');
const pathToAssets = path.resolve(sampleProdDir, 'assets');
const userIntendsToSkipSampleModulesBuild = process.env.ONE_DANGEROUSLY_SKIP_SAMPLE_MODULES_BUILD;
const archiveBuiltArtifacts = argv.archiveBuiltArtifacts || '';
const bundleStaticsOrigin = argv.bundleStaticsOrigin || 'https://sample-cdn.frank';

const sanitizedEnvVars = sanitizeEnvVars();


async function updateModuleVersion(directory, moduleVersion) {
  const packageJsonPath = path.resolve(directory, 'package.json');
  const packageLockPath = path.resolve(directory, 'package-lock.json');
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const packageJson = require(packageJsonPath);
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const packageLock = require(packageLockPath);
  const updatedPackageJson = { ...packageJson, version: moduleVersion };
  const updatedPackageLock = { ...packageLock, version: moduleVersion };

  await fs.writeFile(
    packageJsonPath, JSON.stringify(updatedPackageJson, null, 2)
  );

  await fs.writeFile(
    packageLockPath, JSON.stringify(updatedPackageLock, null, 2)
  );
}

const buildModule = async (pathToModule) => {
  const directory = path.resolve(pathToModule);
  const moduleVersion = path.basename(directory);
  const moduleName = path.basename(path.resolve(directory, '..'));
  await updateModuleVersion(directory, moduleVersion);
  await npmInstall({
    directory,
    moduleName,
    moduleVersion,
    envVars: sanitizedEnvVars,
  });
  await npmProductionBuild({
    directory,
    moduleName,
    moduleVersion,
    envVars: sanitizedEnvVars,
  });
  // use one app git commit sha as module version
  const gitSha = getGitSha();
  const pathToModuleBuildDir = path.resolve(`${pathToModule}/build/`);
  const pathToBundleIntegrityManifest = path.join(`${pathToModule}/bundle.integrity.manifest.json`);
  const pathToOriginModuleStatics = path.resolve(`${nginxOriginStaticsModulesDir}/${gitSha}/${moduleName}`);
  await fs.ensureDir(pathToOriginModuleStatics);
  await fs.copy(pathToModuleBuildDir, pathToOriginModuleStatics, { overwrite: true });

  // eslint-disable-next-line global-require,import/no-dynamic-require
  const integrityDigests = require(pathToBundleIntegrityManifest);

  return {
    moduleName, moduleVersion, integrityDigests, gitSha,
  };
};

const selectDirectories = (dirContents) => dirContents
  .filter((item) => item.isDirectory())
  .map((item) => item.name);

const buildAllSampleModules = async () => {
  const sampleModulesDirContents = await fs.readdir(sampleModulesDir, { withFileTypes: true });
  const sampleModuleNames = selectDirectories(sampleModulesDirContents);
  const moduleNameVersions = {};
  // Map and resolve array of promises from reading version directories
  await Promise.all(
    sampleModuleNames
      .map(async (moduleName) => {
        const versions = selectDirectories(
          await fs.readdir(path.join(sampleModulesDir, moduleName), { withFileTypes: true })
        );
        moduleNameVersions[moduleName] = versions;
      })
  );

  const moduleBuildPromises = [];
  Object.entries(moduleNameVersions).forEach(([moduleName, versions]) => {
    versions.forEach((version) => {
      const pathToModule = path.resolve(sampleModulesDir, moduleName, version);
      moduleBuildPromises.push(buildModule(pathToModule));
    });
  });
  return Promise.all(moduleBuildPromises);
};

const doWork = async () => {
  const sampleModulesAlreadyBuilt = fs.pathExistsSync(nginxOriginStaticsModulesDir)
    && fs.pathExistsSync(pathToNginxOriginModuleMap);

  if (userIntendsToSkipSampleModulesBuild && sampleModulesAlreadyBuilt) {
    console.warn(
      '⚠️  Skipping sample modules build since the "ONE_DANGEROUSLY_SKIP_SAMPLE_MODULES_BUILD"'
      + 'environment variable is set.\n\nNote that your tests **may** be running against an out of date '
      + 'version of your sample modules that does not reflect changes you have made to the source code.'
    );
    process.exit(0);
  }

  if (userIntendsToSkipSampleModulesBuild && !sampleModulesAlreadyBuilt) {
    console.warn(
      '⚠️  Building sample modules despite the "ONE_DANGEROUSLY_SKIP_SAMPLE_MODULES_BUILD"'
      + 'environment variable being set since no pre-built sample modules were found.'
    );
  }

  await Promise.all([
    fs.emptyDir(nginxOriginStaticsModulesDir),
    fs.remove(pathToNginxOriginModuleMap),
  ]);

  const sampleModulesMetadata = await buildAllSampleModules();
  const moduleMapContent = { key: 'not-used-in-development', modules: {} };
  sampleModulesMetadata.forEach(({
    moduleName, moduleVersion, integrityDigests, gitSha,
  }) => {
    const [major, minor, patch] = moduleVersion.split('.');
    if (moduleMapContent.modules[moduleName]) {
      // intent is to add the oldest version of a sample module to the initial module map and then
      // integration tests can add the newer versions dynamically as needed
      const [, currentModuleVersion] = moduleMapContent.modules[moduleName].node.url.split('/').reverse();
      const [currentMajor, currentMinor, currentPatch] = currentModuleVersion.split('.');
      if (currentMajor < major || currentMinor < minor || currentPatch < patch) {
        return;
      }
    }

    moduleMapContent.modules[moduleName] = {
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
  });

  await fs.writeFile(
    pathToNginxOriginModuleMap, JSON.stringify(moduleMapContent, null, 2)
  );

  await fs.copy(pathToAssets, nginxOriginStaticsRootDir);

  if (archiveBuiltArtifacts) {
    const sampleModuleBundlesDirname = 'sample-module-bundles';
    const pathToBundles = path.join(process.cwd(), sampleModuleBundlesDirname);
    await fs.emptyDir(pathToBundles);
    await Promise.all([
      fs.move(nginxOriginStaticsModulesDir, path.join(pathToBundles, 'modules')),
      fs.move(pathToNginxOriginModuleMap, path.join(pathToBundles, 'module-map.json')),
    ]);


    console.log(`✅ Bundled One App Sample Modules and Module Map created at ${pathToBundles}`);
  }
};

doWork().catch((e) => {
  console.error(e);
  process.exit(1);
});
