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
  basicBatchedTask,
} = require('./utils');

const sanitizedEnvVars = sanitizeEnvVars();

const runBatchedModuleCommand = async (command) => {
  const moduleVersionPaths = await getModuleVersionPaths();
  basicBatchedTask(
    moduleVersionPaths,
    (currentBatch) => Promise.all(currentBatch.map((modulePath) => {
      const { moduleName, moduleVersion, directory } = getModuleDetailsFromPath(modulePath);
      return runCommandInModule({
        moduleName,
        moduleVersion,
        directory,
        envVars: sanitizedEnvVars,
      }, command);
    }))
  );
};

// to run `npm update` in all sample modules
// node scripts/run-in-sample-modules npm update
const runCommand = process.argv.slice(2);
runBatchedModuleCommand(runCommand.join(' ')).catch((e) => {
  console.error(e);
  process.exit(1);
});
