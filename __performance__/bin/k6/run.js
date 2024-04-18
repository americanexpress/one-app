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

function k6run({
  testId,
  test,
  target,
  k6args = [],
}) {
  const perfDir = path.resolve(__dirname, '..', '..');
  const commonK6CmdArgs = [test.script, '--out', `json=/results/${testId}/k6-out.json`, '--out', 'influxdb=http://influxdb:8086/k6', '--summary-export', `/results/${testId}/k6-summary.json`, ...k6args];
  const k6CmdOpts = { cwd: perfDir, stdio: 'inherit' };

  if (target) {
    spawnSync('docker', ['compose', 'run', '-e', `${test.target}=${target}`, 'k6', 'run', ...commonK6CmdArgs], k6CmdOpts);
  } else {
    spawnSync('docker', ['compose', '-f', 'docker-compose.yml', '-f', 'docker-compose.prod-sample.yml', 'run', 'k6', 'run', '--insecure-skip-tls-verify', ...commonK6CmdArgs], k6CmdOpts);
  }
}

module.exports = k6run;
