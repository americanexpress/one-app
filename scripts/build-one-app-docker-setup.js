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

const { extract } = require('tar');
const fs = require('fs-extra');
const path = require('path');

const { execSync } = require('child_process');

const {
  nginxOriginStaticsRootDir,
  promisifySpawn,
  sanitizeEnvVars,
  sampleProdDir,
} = require('./utils');

const nginxOriginStaticsAppDir = path.resolve(nginxOriginStaticsRootDir, 'app');

const userIntendsToSkipOneAppImageBuild = process.env.ONE_DANGEROUSLY_SKIP_ONE_APP_IMAGE_BUILD;
const sanitizedEnvVars = sanitizeEnvVars();

const buildDockerImages = async (skipOneAppImageBuild) => {
  console.time('Docker Images Build');
  console.log(`🛠  Building ${skipOneAppImageBuild ? ' ' : 'one-app, '}fast-api, slow-api, and extra-slow-api Docker images`);
  const dockerCmd = `docker-compose build --no-cache --parallel ${skipOneAppImageBuild ? '' : 'one-app'} fast-api slow-api extra-slow-api`
  try {
    await promisifySpawn(dockerCmd, {
      shell: true,
      cwd: sampleProdDir,
      env: { ...sanitizedEnvVars },
    });
  } catch (error) {
    console.log('🚨 Docker images could not be built!\n');
    console.log(`Cmd: "${dockerCmd}"`);
    throw error;
  }
  console.log('✅ Docker images built \n');
  console.timeEnd('Docker Images Build');
};

const generateCertsFor = async (container, commonName) => {
  console.log(`🛠  Generating ${container} certs`);
  try {
    await promisifySpawn(`sh generate-certs.sh ${commonName} ${container}`, { shell: true, cwd: sampleProdDir, env: { ...sanitizedEnvVars } });
  } catch (error) {
    console.log(`🚨 ${container} certs could not be generated\n`);
    throw error;
  }
  console.log(`✅ ${container} certs created! \n`);
};

const collectOneAppStaticFiles = async () => {
  console.log('🛠  Collecting One App static files from Docker image');
  try {
    // clean up any existing static assets tarfiles
    const filesInDirectory = await fs.readdir(process.cwd());
    const oldStaticAssetsArchives = filesInDirectory.filter((fileName) => fileName.match(/^one-app_.+_static-assets\.tgz$/g));
    oldStaticAssetsArchives.forEach(async (file) => fs.remove(file));

    await promisifySpawn('node ./scripts/build-static-assets-artifact.js one-app:at-test', { shell: true, env: { ...sanitizedEnvVars } });

    const filesInDirectoryAfterCleanup = await fs.readdir(process.cwd());
    const staticAssetsArchiveFilename = filesInDirectoryAfterCleanup.find((fileName) => fileName.match(/^one-app_.+_static-assets\.tgz$/));

    await extract({ cwd: path.resolve(nginxOriginStaticsRootDir, 'app'), file: staticAssetsArchiveFilename });
  } catch (error) {
    console.log('🚨 One App Statics could not be pulled from Docker image and moved to Nginx origin dir.\n');
    throw error;
  }
  console.log('✅ One App Statics successfully pulled from Docker image and moved to Nginx origin dir! \n');
};

const doWork = async () => {
  const oneAppImageAlreadyBuilt = execSync('docker images one-app:at-test', { encoding: 'utf8' }).includes('at-test');
  const skipOneAppImageBuild = userIntendsToSkipOneAppImageBuild && oneAppImageAlreadyBuilt;
  if (skipOneAppImageBuild) {
    console.warn(
      '⚠️  Skipping One App Docker image build since the "ONE_DANGEROUSLY_SKIP_ONE_APP_IMAGE_BUILD"'
      + 'environment variable is set.\n\nNote that your tests **may** be running against an out of date '
      + 'version of One App that does not reflect changes you have made to the source code.'
    );
  }

  await Promise.all([
    fs.emptyDir(nginxOriginStaticsAppDir),
  ]);

  if (userIntendsToSkipOneAppImageBuild && !oneAppImageAlreadyBuilt) {
    console.warn(
      '⚠️  Building One App Docker image despite the "ONE_DANGEROUSLY_SKIP_ONE_APP_IMAGE_BUILD"'
      + 'environment variable being set since no pre-built One App Docker image was found.'
    );
  }

  let extraCertsExists = true;

  try {
    await fs.access(path.join(sampleProdDir, 'extra-certs.pem'));
  } catch (err) {
    extraCertsExists = false;
  }

  if (extraCertsExists) {
    await fs.unlink(path.join(sampleProdDir, 'extra-certs.pem'));
    console.log('✅ Removed old extra-certs.pem');
  }

  await Promise.all([
    generateCertsFor('one-app', 'localhost'),
    generateCertsFor('nginx', 'sample-cdn.frank'),
    generateCertsFor('api', '*.api.frank'),
  ]);

  await buildDockerImages(skipOneAppImageBuild);
  await collectOneAppStaticFiles();
};

doWork().catch((e) => {
  console.error(e);
  process.exit(1);
});
