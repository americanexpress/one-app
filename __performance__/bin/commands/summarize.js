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
const path = require('node:path');
const coerceTestId = require('../util/coerceTestId');
const math = require('../util/math');
const pick = require('../util/pick');
const generateTable = require('../util/metricsTable');
const banner = require('../util/banner');
const options = require('../util/options');

module.exports.command = 'summarize <results>';
module.exports.aliases = ['summary'];

module.exports.describe = 'Summarize performance test results';

module.exports.handler = async function summarize(argv) {
  const data = {
    ...JSON.parse(await fs.readFile(path.join(argv.results.dir, 'metrics-k6.json'))),
    ...JSON.parse(await fs.readFile(path.join(argv.results.dir, 'metrics-prom.json'))),
  };

  console.log(banner([{
    label: argv.results.id,
    data,
    meta: JSON.parse(await fs.readFile(path.join(argv.results.dir, 'k6-summary.json'))).meta,
  }], argv.markdown));

  const headers = argv.p.map((processor) => math[processor].label);
  const processors = argv.p.map((processor) => math[processor]);

  const table = generateTable({
    headers,
    processors,
    data: pick(data, argv.metrics),
    markdown: argv.markdown,
    description: argv.description,
    raw: argv.raw,
  });

  console.log(`\n${table}`);
};

module.exports.builder = (yargs) => yargs
  .positional('results', {
    description: 'Test ID or path to test results',
    type: 'string',
    demandOption: true,
    coerce: coerceTestId('results'),
  })
  .option('markdown', options.markdown)
  .option('description', options.description)
  .option('processors', {
    ...options.processors,
    default: ['min', 'mean', 'max', 'p95'],
  })
  .options('raw', options.raw)
  .option('metrics', options.metrics);
