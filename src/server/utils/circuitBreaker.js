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

/* global BigInt */

import { promisify } from 'util';
import CircuitBreaker from 'opossum';
import PrometheusMetrics from 'opossum-prometheus';
import { register } from 'prom-client';
import { composeModules, getModule } from 'holocron';
import { getServerStateConfig } from './stateConfig';

const immediate = promisify(setImmediate);
const { rootModuleName } = getServerStateConfig();
let eventLoopLagThreshold = 30;

export const setEventLoopLagThreshold = (n) => {
  eventLoopLagThreshold = Number(n) || 30;
};

export const getEventLoopLagThreshold = () => eventLoopLagThreshold;

const getModuleData = async ({ dispatch, modules }) => {
  await dispatch(composeModules(modules));
  return false;
};

const options = {
  timeout: false, // Do not use a timeout
  errorThresholdPercentage: 1, // When 1% of requests fail, open the circuit
  resetTimeout: 10e3, // After 10 seconds, try again.
};

const breaker = new CircuitBreaker(getModuleData, options);
// Just need to connect opossum to prometheus
// eslint-disable-next-line no-unused-vars
const metrics = new PrometheusMetrics(breaker, register);

breaker.fallback(() => true);

breaker.healthCheck(async () => {
  if (!getModule(rootModuleName)) return;
  const start = process.hrtime.bigint();
  await immediate();
  const end = process.hrtime.bigint();
  const diff = (end - start) / BigInt(1e6);
  // Open the circuit if event loop lag is greater than threshold
  if (diff > eventLoopLagThreshold) {
    throw new Error(`Opening circuit, event loop lag (${diff}ms) is > eventLoopLagThreshold (${eventLoopLagThreshold}ms)`);
  }
}, 100);

export default breaker;
