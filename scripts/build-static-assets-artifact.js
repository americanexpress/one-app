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

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const mkdirp = require('mkdirp');
const rimraf = require('rimraf');

const TEMP_STATIC_PATH = path.resolve(__dirname, '../.tmp-statics');
const FINAL_TAR_DIR = path.resolve(__dirname, '../');

const DOCKER_IMAGE_LABEL = process.argv[2];
if (!DOCKER_IMAGE_LABEL) {
  // should be the result from `docker build --build-arg HTTPS_PROXY=$HTTPS_PROXY .` or whatever
  // temporary tag was used for that build
  throw new Error('docker image label to copy built static files from is required');
}

function removeDir(dirPath) {
  return new Promise((res, rej) => rimraf(dirPath, { disableGlob: true }, (err) => {
    if (err) {
      rej(err);
    } else {
      res();
    }
  }));
}

function promisifySpawn(...args) {
  return new Promise((res, rej) => {
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
}

function createContainer(imageLabel) {
  return promisifySpawn('docker', ['create', imageLabel])
    .then(
      ({ stdout }) => stdout,
      ({ code, stderr }) => { throw new Error(`docker create ${imageLabel} exited with code ${code} (${stderr})`); }
    );
}

function removeContainer(containerId) {
  return promisifySpawn('docker', ['rm', containerId])
    .then(
      ({ stdout }) => stdout,
      ({ code, stderr }) => { throw new Error(`docker rm ${containerId} exited with code ${code} (${stderr})`); }
    );
}

function copyStaticAssetsFromContainerToLocalFs(containerId, targetPath) {
  return promisifySpawn('docker', ['cp', `${containerId}:/opt/one-app/build/app`, targetPath]);
}

async function extractStaticAssets(imageLabel, targetPath) {
  const containerId = await createContainer(imageLabel);
  try {
    await copyStaticAssetsFromContainerToLocalFs(containerId, targetPath);
  } finally {
    await removeContainer(containerId);
  }
}

function createTarArchive(copiedStaticPath) {
  const copiedStaticAppPath = path.join(copiedStaticPath, 'app');
  return new Promise((res, rej) => fs.readdir(
    copiedStaticAppPath, (err, data) => (err ? rej(err) : res(data))
  ))
    .then((childPaths) => {
      if (childPaths.length !== 1) {
        throw new Error(`expected 1 child path, had ${childPaths.length} (${childPaths})`);
      }
      const [version] = childPaths;
      const tgzFileName = `one-app_${version}_static-assets.tgz`;
      return promisifySpawn(
        'tar',
        ['-zcvf', tgzFileName, version],
        { cwd: copiedStaticAppPath }
      )
        .then(() => path.join(copiedStaticAppPath, tgzFileName));
    });
}

function moveTar(tarPath, finalTarDir) {
  return new Promise((res, rej) => {
    const finalTarPath = path.join(finalTarDir, path.basename(tarPath));
    fs.rename(tarPath, finalTarPath, (err) => (err ? rej(err) : res(finalTarPath)));
  });
}

(async () => {
  try {
    await mkdirp(TEMP_STATIC_PATH);
    await extractStaticAssets(DOCKER_IMAGE_LABEL, TEMP_STATIC_PATH);
    const tmpTarPath = await createTarArchive(TEMP_STATIC_PATH);
    const finalTarPath = await moveTar(tmpTarPath, FINAL_TAR_DIR);
    console.log(`created ${finalTarPath} from ${DOCKER_IMAGE_LABEL}`);
  } catch (err) {
    console.error('unable to build static assets artifact,', err);
    process.exitCode = 1;
  } finally {
    await removeDir(TEMP_STATIC_PATH);
  }
})();
