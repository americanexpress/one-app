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

const fs = require('node:fs/promises');
const fetch = require('cross-fetch');
const { red, bold, underline } = require('colorette');
const generateTestId = require('../util/generateTestId');
const getResultDir = require('../util/getResultDir');
const k6run = require('../k6/run');
const k6parse = require('../k6/parse');
const fetchPromMetrics = require('../prometheus/fetchMetrics');
const tests = require('../k6/tests');

module.exports.command = 'test';

module.exports.describe = 'Run a performance test';

module.exports.handler = async function test(argv) {
  const testId = generateTestId(argv);

  try {
    await fetch('http://localhost:8086/ping');
  } catch (error) {
    console.error(`${red('Error: One App performance monitoring services are not running.')}\nRun ${bold('npm run perf -- monitor')} to start the monitoring services.`);
    process.exit(1);
  }

  await fs.mkdir(getResultDir(testId), { recursive: true });

  k6run({ testId, ...argv });

  const { start, end } = await k6parse({ testId });
  await fetchPromMetrics({ start, end, testId });

  console.log(`\n\n${bold('Test results available at')} ${underline(getResultDir(testId))}`);
};

module.exports.builder = (yargs) => yargs
  .usage(`npm run perf -- test --type=<type>\n\n${module.exports.describe}\n`)
  .usage(`Run ${bold('npm run perf -- explain --tests')} for details on the available test types.`)
  .option('type', {
    description: 'Type of performance test to run',
    type: 'string',
    demandOption: true,
    choices: Object.keys(tests),
  })
  .option('target', {
    description: 'URL of the target service',
    type: 'string',
    coerce: (arg) => arg.replace('localhost', 'host.docker.internal'),
  })
  .option('identifier', {
    description: 'Additional value included in the test ID',
    type: 'string',
  })
  .option('k6args', {
    description: 'Additional arguments to pass to k6 run',
    type: 'string',
    coerce: (arg) => (arg ? arg.split(' ').filter(Boolean) : []),
  })
  .check((argv) => {
    // eslint-disable-next-line no-param-reassign -- yargs API
    argv.test = tests[argv.type];
    if (argv.target && argv.test.target === 'TARGET_BASE_URL') {
      const parsedUrl = new URL(argv.target);
      if (parsedUrl.pathname !== '/') {
        throw new Error(`Bad option: ${underline('target')} must not include a path for ${argv.type} tests.\n  These tests execute against a variety of predefined paths based on the structure of the prod-sample.`);
      }
    }
    return true;
  });
