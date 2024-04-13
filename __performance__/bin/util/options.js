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

const { red, underline, bold } = require('colorette');

const metrics = {
  ...require('../k6/metrics'),
  ...require('../prometheus/metrics'),
};

module.exports.description = {
  alias: 'd',
  description: 'Include a description of each metric in the results table',
  type: 'boolean',
  default: false,
};

module.exports.processors = {
  alias: 'p',
  description: 'processors to run on each column of data',
  type: 'array',
  default: ['mean', 'max'],
  choices: ['sum', 'mean', 'median', 'mode', 'min', 'max', 'p95', 'p90'],
};

module.exports.raw = {
  alias: 'r',
  description: 'Output metrics unformatted (unitless)',
  type: 'boolean',
  default: false,
};

module.exports.metrics = {
  alias: 'm',
  type: 'array',
  description: 'metrics to compare',
  coerce: (arg) => {
    const invalidMetrics = arg.filter((metric) => !Object.keys(metrics).includes(metric));

    if (invalidMetrics.length > 0) {
      throw new Error(`${red(`Bad option: ${underline('metrics')} invalid metric(s) provided`)}\n  Run ${bold('npm run perf -- explain')} to list available metrics.`);
    }

    return arg;
  },
  defaultDescription: `Run ${bold('npm run perf -- explain --defaults')} to list`,
  default: [
    'http_req_duration',
    'http_req_blocked',
    'http_req_waiting',
    'http_req_receiving',
    'nodejs_heap_size_total_bytes',
    'nodejs_heap_size_used_bytes',
    'nodejs_heap_space_size_used_bytes',
    'nodejs_eventloop_lag_seconds',
    'rate(process_cpu_seconds_total[1m])',
    'rate(process_cpu_system_seconds_total[1m])',
    'rate(process_cpu_user_seconds_total[1m])',
    'rate(nodejs_gc_duration_seconds_sum[1m])',
    'histogram_quantile(0.95, sum(rate(nodejs_gc_duration_seconds_bucket[1m])) by (le))',
    'rate(circuit{event="open"}[1m])',
    'rate(circuit{event="close"}[1m])',
  ],
};

module.exports.markdown = {
  description: 'Print the results table in markdown',
  type: 'boolean',
  default: false,
  coerce: (arg) => {
    if (arg === true) {
      process.env.MARKDOWN = 'true';
    }
    return arg;
  },
};
