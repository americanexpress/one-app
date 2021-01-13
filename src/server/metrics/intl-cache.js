/*
 * Copyright 2021 American Express Travel Related Services Company, Inc.
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

import { getEstimatedSize } from '@americanexpress/one-app-ducks/lib/intl/server-cache';
import { createGauge, setGauge } from './gauges';
import createMetricNamespace from './create-metric-namespace';

const intlServerCacheNamespace = createMetricNamespace('intl');

createGauge({
  name: intlServerCacheNamespace('cache_size', 'total'),
  help: 'estimated intl server cache size',
});

const metricNames = intlServerCacheNamespace.getMetricNames();

export const cacheSizeCollector = () => {
  setGauge(metricNames.cacheSize, getEstimatedSize());
};

export default metricNames;
