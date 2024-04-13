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

const table = require('markdown-table');
const { Table } = require('console-table-printer');
const {
  testType, time, timeDiff, colors,
} = require('./format');
const { sum } = require('./math');

const metrics = {
  ...require('../k6/metrics'),
  ...require('../prometheus/metrics'),
};

function labelledMetric(metric, data, processor) {
  const { bold } = colors();
  return `${metrics[metric].label}: ${bold(metrics[metric].format(processor(data[metric])))}`;
}

function banner(colData, markdown = false) {
  const rows = [
    colData.map(({ meta }) => testType(meta.type)),
    colData.map(({ meta }) => time(meta.timestamp, 'Completed:')),
    colData.map(({ meta }) => timeDiff(meta.start, meta.end, 'Duration')),
    colData.map(({ data }) => labelledMetric('http_reqs', data, sum)),
    colData.map(({ data }) => labelledMetric('data_received', data, sum)),
    colData.map(({ data }) => labelledMetric('http_req_failed', data, sum)),
  ];

  if (colData.some(({ id }) => !!id)) rows.push(colData.map(({ id }) => id));

  if (markdown) {
    return table([
      colData.map(({ label }) => label),
      ...rows,
    ]);
  }

  const consoleTable = new Table({
    columns: colData.map(({ label }) => ({ name: label, alignment: 'left', color: 'none' })),
    colorMap: { none: '' },
  });

  consoleTable.addRows(rows.map((row) => row.reduce((acc, curr, i) => ({
    ...acc, [colData[i].label]: curr,
  }), {})));

  return consoleTable.render();
}

module.exports = banner;
