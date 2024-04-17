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

const { Table } = require('console-table-printer');
const { bold } = require('colorette');
const options = require('../util/options');
const processors = require('../util/math');
const tests = require('../util/tests');

const metrics = {
  ...require('../k6/metrics'),
  ...require('../prometheus/metrics'),
};

module.exports.command = 'explain [metric]';

module.exports.describe = 'Print descriptions of metrics';

module.exports.handler = async function explain(argv) {
  if (argv.metric) {
    const rows = [
      [`${bold('Label:')} ${metrics[argv.metric].label}`],
      [' '],
      [`${bold('Description:')} ${metrics[argv.metric].description}`],
    ];

    const table = new Table({
      columns: [{
        name: argv.metric,
        alignment: 'center',
        color: 'none',
        maxLen: 60,
      }],
      colorMap: { none: '' },
    });

    table.addRows(rows.map((row) => ({ [argv.metric]: row })));

    table.printTable();

    return;
  }

  function joinDesc(description, i) {
    if (Array.isArray(description)) {
      if (i < Object.keys(argv.data).length - 1) description.push('');
      return description.join(` ${'\u00A0'.repeat(60)} `);
    }
    return description;
  }

  const headers = ['Label', argv.primaryLabel, 'Description'];
  const rows = Object.entries(argv.data)
    .filter(([metric]) => (argv.defaults ? options.metrics.default.includes(metric) : true))
    .map(([metric, { label, description }], i) => [label, metric, joinDesc(description, i)]);

  const consoleTable = new Table({
    columns: [
      {
        name: 'Label',
        alignment: 'left',
        color: 'none',
      },
      {
        name: argv.primaryLabel,
        alignment: 'left',
        color: 'none',
        minLen: argv.primaryLabel.length,
        maxLen: Math.min(30, Math.max(...rows.map((row) => row[1].length))),
      },
      {
        name: 'Description',
        alignment: 'left',
        color: 'none',
        maxLen: 50,
      },
    ],
    colorMap: { none: '' },
  });

  consoleTable.addRows(rows.map((row) => row.reduce((acc, col, i) => ({
    ...acc,
    [headers[i]]: col,
  }), {})));

  consoleTable.printTable();
};

module.exports.builder = (yargs) => yargs
  .positional('metric', {
    description: 'name of the metric to explain',
    type: 'string',
    coerce: (arg) => {
      if (Object.keys(metrics).includes(arg)) return arg;
      console.warn(bold(`Warning: Invalid metric (${arg}) given. Listing all metrics.\n`));
      return undefined;
    },
  })
  .options('label', {
    description: 'look up metric by label',
    type: 'string',
    conflicts: ['metric', 'defaults', 'processors', 'tests'],
  })
  .option('defaults', {
    description: 'list the default metrics',
    type: 'boolean',
    conflicts: ['label', 'processors', 'metric', 'tests'],
  })
  .option('processors', {
    description: 'explain the data processors',
    type: 'boolean',
    conflicts: ['metric', 'label', 'defaults', 'tests'],
  })
  .option('tests', {
    description: 'explain the tests',
    type: 'boolean',
    conflicts: ['metric', 'label', 'defaults', 'processors'],
  })
  .check((argv) => {
    /* eslint-disable no-param-reassign -- yargs API */
    if (argv.label) {
      const metric = Object.keys(metrics).find(
        (key) => metrics[key].label.toLowerCase() === argv.label.toLowerCase()
      );
      if (metric) {
        argv.metric = metric;
      } else {
        console.warn(bold(`Warning: Unable to find metric with label "${argv.label}". Listing all metrics.\n`));
      }
    }
    if (argv.processors) {
      argv.data = processors;
      argv.primaryLabel = 'Processor';
    } else if (argv.tests) {
      argv.data = tests;
      argv.primaryLabel = 'Test Type';
    } else {
      argv.data = metrics;
      argv.primaryLabel = 'Metric';
    }
    return true;
    /* eslint-enable no-param-reassign -- yargs API */
  });
