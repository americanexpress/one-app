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

const coerceTestId = require('../util/coerceTestId');
const pick = require('../util/pick');
const generateTable = require('../util/metricsTable');
const banner = require('../util/banner');
const options = require('../util/options');
const readResults = require('../util/readResults');

module.exports.command = 'summarize <results>';
module.exports.aliases = ['summary'];

module.exports.describe = 'Summarize performance test results';

module.exports.handler = async function summarize(argv) {
  const { results } = argv;

  console.log(banner([results], argv.markdown));

  const table = generateTable({
    ...argv,
    data: pick(results.data, argv.metrics),
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
  .option('metrics', options.metrics)
  .check(async (argv) => {
    Object.assign(argv.results, await readResults(argv.results.dir));
    return true;
  });
