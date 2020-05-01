/*
 * Copyright 2020 American Express Travel Related Services Company, Inc.
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

import { register } from 'prom-client';
import PrometheusMetrics from 'opossum-prometheus';
import CircuitBreaker from 'opossum';

// Metrics must be initialized with a circuit breaker, since
// its not used there won't be any related metrics reported.
/* istanbul ignore next */
const noop = () => 0;
const noopBreaker = new CircuitBreaker(noop);
const metrics = new PrometheusMetrics(noopBreaker, register);

/* eslint-disable-next-line import/prefer-default-export */
export const registerCircuitBreaker = (breaker) => {
  metrics.add([breaker]);
};
