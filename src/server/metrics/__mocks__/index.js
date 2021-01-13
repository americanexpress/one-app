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

const incrementCounter = jest.fn();
const incrementGauge = jest.fn();
const setGauge = jest.fn();
const resetGauge = jest.fn();

const holocron = {
  moduleMapPoll: 'module_map_poll',
  moduleMapPollConsecutiveErrors: 'module_map_poll_consecutive_errors',
  moduleMapPollWait: 'module_map_poll_wait',
};

const intlCache = {
  cacheSize: 'cache_size',
};

const appVersion = { info: 'info' };

export {
  // counters
  incrementCounter,

  // gauges
  incrementGauge,
  setGauge,
  resetGauge,

  // metrics
  holocron,
  appVersion,
  intlCache,
};
