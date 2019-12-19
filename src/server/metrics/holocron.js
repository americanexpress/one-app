/*
 * Copyright 2019 American Express Travel Related Services Company, Inc.
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

import { createCounter } from './counters';
import { createGauge } from './gauges';

import createMetricNamespace from './create-metric-namespace';

const holocronNamespace = createMetricNamespace('holocron');

createCounter({
  name: holocronNamespace('module_map_poll', 'total'),
  help: 'total times the module map has been polled',
});

createGauge({
  name: holocronNamespace('module_map_poll_wait', 'seconds'),
  help: 'delay until the next poll of the module map',
});

createGauge({
  name: holocronNamespace('module_map_poll_consecutive_errors', 'total'),
  help: 'how many times has the server encountered errors polling the module map',
});

export default holocronNamespace.getMetricNames();
