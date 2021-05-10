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
const { spawn, execSync } = require('child_process');

const sampleProdDir = path.resolve('./prod-sample/');
const sampleModulesDir = path.resolve(sampleProdDir, 'sample-modules');
const nginxOriginStaticsRootDir = path.resolve(sampleProdDir, 'nginx', 'origin-statics');

const sanitizeEnvVars = () => {
  const sanitizedEnvVars = {};
  Object.keys(process.env).forEach((key) => {
    const value = process.env[key];
    // remove env vars that can interfere when programmatically running `npm` scripts
    if (!key.startsWith('npm_') && key !== 'PWD' && key !== 'INIT_CWD') {
      sanitizedEnvVars[key] = value;
    }
  });

  return sanitizedEnvVars;
};

const promisifySpawn = (...args) => new Promise((res, rej) => {
  const spawnedProcess = spawn(...args);
  let stdout = '';
  let stderr = '';
  spawnedProcess.stdout.on('data', (d) => { stdout += d; });
  spawnedProcess.stderr.on('data', (d) => { stderr += d; });
  spawnedProcess.on('close', (code) => {
    const data = {
      code,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };
    if (code !== 0) {
      rej(data);
    } else {
      res(data);
    }
  });
});

const runCommandInModule = async (
  {
    directory,
    moduleName,
    moduleVersion,
    envVars = {},
  },
  command
) => {
  console.time(`${moduleName}@${moduleVersion}`);
  console.log(`⚙️ Performing ${command} on ${moduleName}@${moduleVersion}...`);
  try {
    await promisifySpawn(command, {
      cwd: directory,
      shell: true,
      env: {
        ...envVars,
        NODE_ENV: 'development',
        NPM_CONFIG_PRODUCTION: false,
      },
    });
  } catch (error) {
    console.error(`🚨 ${moduleName}@${moduleVersion} failed ${command}:`, error);
    throw error;
  }
  console.log(`✅ ‍${moduleName}@${moduleVersion} successfully ran ${command}`);
  console.timeEnd(`${moduleName}@${moduleVersion}`);
};

async function npmInstall({
  directory, moduleName, moduleVersion, envVars = {},
}) {
  return runCommandInModule({
    directory, moduleName, moduleVersion, envVars,
  }, 'npm ci');
}

async function npmProductionBuild({
  directory, moduleName, moduleVersion, envVars = {},
}) {
  console.time(`${moduleName}@${moduleVersion}`);
  console.log(`🛠  Building ${moduleName}@${moduleVersion}...`);
  try {
    await promisifySpawn('npm run build', { shell: true, cwd: directory, env: { ...envVars, NODE_ENV: 'production' } });
  } catch (error) {
    console.error(`🚨 ${moduleName}@${moduleVersion} failed to build:`);
    throw error;
  }
  console.log(`✅ ‍${moduleName}@${moduleVersion} Built!`);
  console.timeEnd(`${moduleName}@${moduleVersion}`);
}

const getGitSha = () => {
  const stdout = execSync('git rev-parse --short HEAD').toString();
  return stdout.trim();
};

const selectDirectories = (dirContents) => dirContents
  .filter((item) => item.isDirectory())
  .map((item) => item.name);

const getSampleModuleVersions = async () => {
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
  return moduleNameVersions;
};

const getModuleVersionPaths = async () => {
  const modulePaths = [];
  const sampleModuleVersions = await getSampleModuleVersions();
  Object.entries(sampleModuleVersions).forEach(([moduleName, versions]) => {
    versions.forEach((version) => {
      const pathToModuleVersion = path.resolve(sampleModulesDir, moduleName, version);
      modulePaths.push(pathToModuleVersion);
    });
  });
  return modulePaths;
};

const getModuleDetailsFromPath = (pathToModule) => {
  const directory = path.resolve(pathToModule);
  const moduleVersion = path.basename(directory);
  const moduleName = path.basename(path.resolve(directory, '..'));
  return { moduleName, moduleVersion, directory };
};

module.exports = {
  sampleProdDir,
  sampleModulesDir,
  nginxOriginStaticsRootDir,
  sanitizeEnvVars,
  promisifySpawn,
  npmProductionBuild,
  npmInstall,
  getGitSha,
  getSampleModuleVersions,
  getModuleVersionPaths,
  getModuleDetailsFromPath,
  runCommandInModule,
};
