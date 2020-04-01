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
const { spawn } = require('child_process');

const sampleProdDir = resolve('./prod-sample/');
const sampleModulesDir = resolve(sampleProdDir, 'sample-modules');
const nginxOriginStaticsRootDir = resolve(sampleProdDir, 'nginx', 'origin-statics');

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

module.exports = {
  sampleProdDir,
  sampleModulesDir,
  nginxOriginStaticsRootDir,
  sanitizeEnvVars,
  promisifySpawn,
};
