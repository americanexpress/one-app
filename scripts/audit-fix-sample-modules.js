#!/usr/bin/env node

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

const {
  getModuleVersionPaths,
  getModuleDetailsFromPath,
  sanitizeEnvVars,
  runCommandInModule,
} = require('./utils');

const sanitizedEnvVars = sanitizeEnvVars();

const basicBatch = (list, batchSize = 5) => {
  const totalBatches = Math.max(Math.round(list.length / batchSize), 1);
  const batches = [];
  list.forEach((item, index) => {
    const batchNumber = index % totalBatches;
    batches[batchNumber] = [item, ...batches[batchNumber] ? batches[batchNumber] : []];
    return batches;
  }, []);
  return batches;
};

const runBatchedModuleCommand = async (command) => {
  const moduleVersionPaths = await getModuleVersionPaths();
  const batches = basicBatch(moduleVersionPaths);

  for (let batchNumber = 0; batchNumber < batches.length; batchNumber += 1) {
    const currentBatch = batches[batchNumber];
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(currentBatch.map((modulePath) => {
      const { moduleName, moduleVersion, directory } = getModuleDetailsFromPath(modulePath);
      return runCommandInModule({
        moduleName,
        moduleVersion,
        directory,
        envVars: sanitizedEnvVars,
      }, command);
    }));
  }
};


runBatchedModuleCommand('npm audit fix').catch((e) => {
  console.error(e);
  process.exit(1);
});
