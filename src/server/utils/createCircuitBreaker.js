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
let eventLoopDelayPercentile = 100;

export const setEventLoopDelayThreshold = (n) => {
  eventLoopDelayThreshold = Number.parseInt(n, 10) || 250;
};

// Default to p(100) to avoid breaking change for users expecting max delay
export const setEventLoopDelayPercentile = (n = 100) => {
  if (n !== Number.parseInt(n, 10) || n < 1 || n > 100) {
    console.warn('Event loop percentile must be an integer in range 1-100; given %s. Defaulting to p(100).', JSON.stringify(n));
    eventLoopDelayPercentile = 100;
    return;
  }
  eventLoopDelayPercentile = n;
};

export const getEventLoopDelayThreshold = () => eventLoopDelayThreshold;
export const getEventLoopDelayPercentile = () => eventLoopDelayPercentile;

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

export const getEventLoopDelayHistogram = () => eventLoopDelayHistogram;

let histogramResetInterval;
const clearAndResetHistorgramResetInterval = () => {
  clearInterval(histogramResetInterval);
  // Reset histogram every 30 seconds because it biases lower over time
  histogramResetInterval = setInterval(() => eventLoopDelayHistogram.reset(), 30e3);
};

const checkEventLoopDelay = async () => {
  if (process.env.NODE_ENV === 'development') return;
  // Return if root module is not loaded, as that is where threshold is configured
  if (!getModule(rootModuleName)) return;
  // Get event loop delay in milliseconds (from nanoseconds)
  const eventLoopDelay = eventLoopDelayHistogram.percentile(eventLoopDelayPercentile) / 1e6;
  // Open the circuit if event loop delay is greater than threshold
  if (eventLoopDelay > eventLoopDelayThreshold) {
    eventLoopDelayHistogram.reset();
    // Resetting interval on circuit open will guarantee at least 10s of data on retry
    clearAndResetHistorgramResetInterval();
    throw new Error(`Opening circuit, p(${eventLoopDelayPercentile}) event loop delay (${eventLoopDelay}ms) is > eventLoopDelayThreshold (${eventLoopDelayThreshold}ms)`);
  }
};

const createCircuitBreaker = (asyncFunctionThatMightFail) => {
  // asyncFunctionThatMightFail should return { fallback: false } to indicate fallback is not needed
  const breaker = new CircuitBreaker(asyncFunctionThatMightFail, options);
  // Fallback returns true to indicate fallback behavior is needed
  breaker.fallback(() => ({ fallback: true }));
  // Check the event loop delay every 5 seconds
  breaker.healthCheck(checkEventLoopDelay, 5e3);
  clearAndResetHistorgramResetInterval();
  // Log when circuit breaker opens and closes
  breaker.on('open', () => console.log('Circuit breaker [%s] opened', asyncFunctionThatMightFail.name));
  breaker.on('close', () => console.log('Circuit breaker [%s] closed', asyncFunctionThatMightFail.name));
  breaker.on('healthCheckFailed', (error) => console.error(error));
  // Track circuit breaker metrics
  registerCircuitBreaker(breaker);
  return breaker;
};

export default createCircuitBreaker;
