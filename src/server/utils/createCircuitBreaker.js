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

import { monitorEventLoopDelay } from 'perf_hooks';
import CircuitBreaker from 'opossum';
import { getModule } from 'holocron';
import { getServerStateConfig } from './stateConfig';
import { registerCircuitBreaker } from '../metrics/circuit-breaker';

const { rootModuleName } = getServerStateConfig();
let eventLoopDelayThreshold = 250;

export const setEventLoopDelayThreshold = (n) => {
  eventLoopDelayThreshold = Number(n) || 250;
};

export const getEventLoopDelayThreshold = () => eventLoopDelayThreshold;

const options = {
  // Do not use a timeout
  timeout: false,
  // When 10% of requests fail, open the circuit
  errorThresholdPercentage: 10,
  // After 10 seconds, try again.
  resetTimeout: 10e3,
};

const eventLoopDelayHistogram = monitorEventLoopDelay();
eventLoopDelayHistogram.enable();

const checkMaxEventLoopDelay = async () => {
  // Return if root module is not loaded, as that is where threshold is configured
  if (!getModule(rootModuleName)) return;
  // Get event loop delay in milliseconds (from nanoseconds)
  const maxEventLoopDelay = eventLoopDelayHistogram.max / 1e6;
  // Open the circuit if event loop delay is greater than threshold
  if (maxEventLoopDelay > eventLoopDelayThreshold) {
    eventLoopDelayHistogram.reset();
    throw new Error(`Opening circuit, event loop delay (${maxEventLoopDelay}ms) is > eventLoopDelayThreshold (${eventLoopDelayThreshold}ms)`);
  }
};

const createCircuitBreaker = (asyncFuntionThatMightFail) => {
  // asyncFuntionThatMightFail should return false to indicate fallback is not needed
  const breaker = new CircuitBreaker(asyncFuntionThatMightFail, options);
  // Fallback returns true to indicate fallback behavior is needed
  breaker.fallback(() => true);
  // Check the max event loop delay every 500ms
  breaker.healthCheck(checkMaxEventLoopDelay, 500);
  // Track circuit breaker metrics
  registerCircuitBreaker(breaker);
  return breaker;
};

export default createCircuitBreaker;
