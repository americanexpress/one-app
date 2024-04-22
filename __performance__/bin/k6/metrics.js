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

const { bytes, float, milliseconds } = require('../util/format');

const metrics = {
  http_reqs: {
    label: 'HTTP Requests',
    format: float,
    description: 'total HTTP requests k6 generated',
  },
  http_req_duration: {
    label: 'Request Duration',
    format: milliseconds,
    description: 'total time for the request. It\'s equal to http_req_sending + http_req_waiting + http_req_receiving (i.e. how long did the remote server take to process the request and respond, without the initial DNS lookup/connection times)',
  },
  http_req_blocked: {
    label: 'Request Blocked',
    format: milliseconds,
    description: 'time spent blocked (waiting for a free TCP connection slot) before initiating the request',
  },
  http_req_connecting: {
    label: 'Request Connecting',
    format: milliseconds,
    description: 'time spent establishing TCP connection to the remote host',
  },
  http_req_tls_handshaking: {
    label: 'TLS Handshaking',
    format: milliseconds,
    description: 'time spent handshaking TLS session with remote host',
  },
  http_req_sending: {
    label: 'Request Sending',
    format: milliseconds,
    description: 'time spent sending data to the remote host',
  },
  http_req_waiting: {
    label: 'TTFB',
    format: milliseconds,
    description: 'time spent waiting for response from remote host (a.k.a. “time to first byte”, or “TTFB”)',
  },
  http_req_receiving: {
    label: 'Request Receiving',
    format: milliseconds,
    description: 'time spent receiving response data from the remote host',
  },
  http_req_failed: {
    label: 'Failed Requests',
    format: float,
    description: 'the rate of failed requests according',
  },
  checks: {
    label: 'Checks',
    format: float,
    description: 'rate of successful checks',
  },
  vus: {
    label: 'VUs',
    format: float,
    description: 'active virtual users',
  },
  vus_max: {
    label: 'Max VUs',
    format: float,
    description: 'max possible number of virtual users',
  },
  data_sent: {
    label: 'Data Sent',
    format: bytes,
    description: 'amount of data sent',
  },
  data_received: {
    label: 'Data Received',
    format: bytes,
    description: 'amount of received data',
  },
  iteration_duration: {
    label: 'Iteration Duration',
    format: milliseconds,
    description: 'time to complete one full iteration, including time spent in setup and teardown',
  },
  iterations: {
    label: 'Iterations',
    format: float,
    description: 'aggregate number of times the VUs execute the JS script',
  },
};

module.exports = metrics;
