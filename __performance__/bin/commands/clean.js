/*
 * Copyright 2024 American Express Travel Related Services Company, Inc.
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

const { spawnSync } = require('node:child_process');
const path = require('node:path');

module.exports.command = 'clean';

module.exports.describe = 'Clean up performance test results';

module.exports.handler = function clean(argv) {
  spawnSync('git', ['clean', argv.gitArgs, path.join('__performance__', 'results')], { stdio: 'inherit' });
};

module.exports.builder = (yargs) => yargs
  .option('dry-run', {
    alias: 'n',
    description: 'List files that would be deleted without deleting them',
    type: 'boolean',
  })
  .option('force', {
    alias: 'f',
    description: 'Force deletion of files',
    type: 'boolean',
  })
  .option('quiet', {
    alias: 'q',
    description: 'Suppress output',
    type: 'boolean',
  })
  .conflicts('dry-run', 'force')
  .check((argv) => {
    if (!argv.dryRun && !argv.force) {
      throw new Error('You must specify either --dry-run or --force');
    }
    // eslint-disable-next-line no-param-reassign -- yargs API
    argv.gitArgs = Object.entries(argv)
      .filter(([key, value]) => /^\w$/.test(key) && value === true)
      .reduce((acc, [key]) => acc + key, '-xd');
    return true;
  });
