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
const k6metrics = require('../k6/metrics');
const promMetrics = require('../prometheus/metrics');

const metrics = { ...k6metrics, ...promMetrics };

function generateMetricsTable({
  data,
  headers,
  processors,
  markdown = false,
  description = false,
  raw = false,
}) {
  const rows = Object.keys(data).map((metric) => [
    metrics[metric].label,
    description && (metrics[metric].description || ' '),
    ...processors.map((processor) => {
      if (processor.length === 1) {
        return raw ? processor(data[metric]) : metrics[metric].format(processor(data[metric]));
      }
      return processor(metric, data[metric], raw ? (x) => x : metrics[metric].format);
    }),
  ].filter(Boolean));

  const tableHeaders = ['Metric', description && 'Description', ...headers].filter(Boolean);

  if (markdown) {
    return table([
      tableHeaders,
      ...rows,
    ]);
  }

  const consoleTable = new Table({
    columns: [
      { name: 'Metric', alignment: 'left', color: 'cyan' },
      description && {
        name: 'Description', alignment: 'left', maxLen: 40, color: 'none',
      },
      ...headers.map((name) => ({ name, alignment: 'left', color: 'none' })),
    ].filter(Boolean),
    colorMap: { none: '' },
  });

  consoleTable.addRows(rows.map((row) => row.reduce((acc, col, i) => ({
    ...acc,
    [tableHeaders[i]]: col,
  }), {})));

  return consoleTable.render();
}

module.exports = generateMetricsTable;
