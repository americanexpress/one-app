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

const {
  append,
  bytes,
  percent,
  seconds,
} = require('../util/format');

const metrics = {
  nodejs_heap_size_total_bytes: {
    label: 'Heap Total',
    format: bytes,
    description: 'total size of the allocated heap',
  },
  nodejs_heap_size_used_bytes: {
    label: 'Heap Used',
    format: bytes,
    description: 'actual memory used during the execution of our process',
  },
  process_resident_memory_bytes: {
    label: 'Resident Set Size',
    format: bytes,
    description: 'the total memory allocated for the process execution',
  },
  nodejs_external_memory_bytes: {
    label: 'External',
    format: bytes,
    description: 'memory used by "C++ objects bound to JavaScript objects managed by V8"',
  },
  nodejs_heap_space_size_available_bytes: {
    label: 'Available Space',
    format: bytes,
    description: 'process heap space size available from Node.js in bytes',
  },
  nodejs_heap_space_size_used_bytes: {
    label: 'Used Space',
    format: bytes,
    description: 'process heap space size used from Node.js in bytes',
  },
  nodejs_heap_space_size_total_bytes: {
    label: 'Total Space',
    format: bytes,
    description: 'process heap space size total from Node.js in bytes',
  },
  nodejs_eventloop_lag_seconds: {
    label: 'Event loop Lag',
    format: seconds,
    description: 'lag of event loop in seconds',
  },
  'rate(process_cpu_seconds_total[1m])': {
    label: 'Process CPU',
    format: percent,
    description: 'total user and system CPU usage',
  },
  'rate(process_cpu_system_seconds_total[1m])': {
    label: 'System CPU',
    format: percent,
    description: 'total system CPU usage',
  },
  'rate(process_cpu_user_seconds_total[1m])': {
    label: 'User CPU',
    format: percent,
    description: 'total user CPU usage',
  },
  'rate(nodejs_gc_duration_seconds_sum[1m])': {
    label: 'GC Rate',
    format: append('/s', seconds),
    description: 'rate of garbage collection (GC time spent per second)',
  },
  'histogram_quantile(0.95, sum(rate(nodejs_gc_duration_seconds_bucket[1m])) by (le))': {
    label: 'GC Duration',
    format: seconds,
    description: 'duration of garbage collection runs, 95th percentile',
  },
  'rate(circuit{event="open"}[1m])': {
    label: 'Circuit Breaker Open',
    format: append('/s'),
    description: 'rate of circuit breaker open events per second',
  },
  'rate(circuit{event="close"}[1m])': {
    label: 'Circuit Breaker Close',
    format: append('/s'),
    description: 'rate of circuit breaker close events per second',
  },
};

module.exports = metrics;
