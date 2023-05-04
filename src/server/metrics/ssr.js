/*
 * Copyright 2023 American Express Travel Related Services Company, Inc.
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

import { createSummary } from './summaries';

import createMetricNamespace from './create-metric-namespace';

const ssrNamespace = createMetricNamespace('ssr');

createSummary({
  name: ssrNamespace('react_rendering', 'seconds'),
  help: 'time taken by React to render HTML',
  percentiles: [0.1, 0.5, 0.9, 0.95],
  labelNames: ['path', 'renderMethodName'],
});

export default ssrNamespace.getMetricNames();
