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

/**
 * In order for this script to be successful, version must have
 * been bumped to latest during release process
 */
const { spawnSync } = require('child_process');
const appVersion = require('../package.json').version;

function runSpawn(...args) {
  const {
    error,
    status,
    stdout,
    stderr,
  } = spawnSync(...args);

  if (status === 0) {
    console.log('Output:', stdout.toString());
  } else {
    console.error(`Error when running spawn with args ${args}: `, error || stderr.toString());
  }
}

runSpawn('generate-changelog', ['-p', 'ONE', '-r', 'one-app']);
runSpawn('git', ['add', 'changelog-archive', 'CHANGELOG.md']);
runSpawn('git', ['commit', '-m', `docs(changelog): update changelog to v${appVersion}`, '--no-verify']);
