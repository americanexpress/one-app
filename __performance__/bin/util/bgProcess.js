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

const fs = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const pkg = require('../../../package.json');

const dir = join(tmpdir(), `one-perf-${pkg.version}`);
const filePath = join(dir, 'processes.json');

fs.mkdirSync(dir, { recursive: true });

const getLogFile = (name) => join(dir, `${name}.log`);

async function saveProcess(name, pid) {
  let processes = {};
  if (fs.existsSync(filePath)) {
    try {
      processes = JSON.parse(fs.promises.readFile(filePath));
    } catch (error) { /* ignore */ }
  }
  processes[name] = pid;
  await fs.promises.writeFile(filePath, JSON.stringify(processes, null, 2));
}

async function killProcess(name) {
  if (!fs.existsSync(filePath)) {
    console.error('No processes found.');
    process.exit(1);
  }
  const processes = JSON.parse(await fs.promises.readFile(filePath));
  const pid = processes[name];
  if (!pid) {
    console.error(`No process found with the name "${name}".`);
    process.exit(1);
  }
  console.log(`Killing process ${name}:${pid}...`);
  try {
    process.kill(pid, 'SIGTERM');
  } catch (error) {
    console.error(`Failed to kill process ${name}:${pid}. Continuing cleanup...`);
  }
  const logFile = getLogFile(name);
  await fs.promises.rm(logFile);
  delete processes[name];
  if (Object.keys(processes).length === 0) {
    await fs.promises.rm(filePath);
  } else {
    await fs.promises.writeFile(filePath, JSON.stringify(processes, null, 2));
  }
  process.exit(0);
}

async function retrieveProcess(name) {
  if (!fs.existsSync(filePath)) {
    console.error('No processes found.');
    process.exit(1);
  }
  const processes = JSON.parse(await fs.promises.readFile(filePath));
  const pid = processes[name];
  if (!pid) {
    console.error(`No process found with the name "${name}".`);
    process.exit(1);
  }
  return {
    name,
    pid,
    logFile: getLogFile(name),
  };
}

module.exports = {
  getLogFile,
  retrieveProcess,
  killProcess,
  saveProcess,
};
