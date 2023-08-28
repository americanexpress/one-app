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

import loadModules from './loadModules';
import {
  incrementCounter,
  incrementGauge,
  setGauge,
  resetGauge,

  holocron as holocronMetrics,
} from '../metrics';

let moduleMapHealthy = null;
export const getModuleMapHealth = () => moduleMapHealthy;

const minPollTimeLimit = 1e3; // 1 second
export const MIN_POLL_TIME = Math.max(
  process.env.ONE_MAP_POLLING_MIN
    ? Number.parseInt(process.env.ONE_MAP_POLLING_MIN, 10) * 1e3
    : 1e3 * 5, // 5 seconds
  minPollTimeLimit
);

export const MAX_POLL_TIME = process.env.ONE_MAP_POLLING_MAX
  ? Number.parseInt(process.env.ONE_MAP_POLLING_MAX, 10) * 1e3
  : 1e3 * 60 * 5; // 5min

if (Number.isNaN(MIN_POLL_TIME) || Number.isNaN(MAX_POLL_TIME)) {
  throw new TypeError('ONE_MAP_POLLING_MIN or ONE_MAP_POLLING_MAX misformatted');
}

if (MAX_POLL_TIME < MIN_POLL_TIME) {
  throw new Error('ONE_MAP_POLLING_MAX is less than ONE_MAP_POLLING_MIN (default 5s)');
}

let currentPollTime = MIN_POLL_TIME;

function resetPollTime() {
  currentPollTime = MIN_POLL_TIME;
  setGauge(holocronMetrics.moduleMapPollWait, currentPollTime / 1e3);
  return currentPollTime;
}

function incrementPollTime() {
  currentPollTime = Math.min(
    MAX_POLL_TIME,
    Math.floor(currentPollTime * (1.25 + (Math.random() / 3)))
  );
  setGauge(holocronMetrics.moduleMapPollWait, currentPollTime / 1e3);
  return currentPollTime;
}

const setLaterWithoutBlockingStopping = (laterMethod) => (...args) => {
  const handle = laterMethod(...args);
  if (handle && handle.unref) {
    // https://nodejs.org/api/timers.html#timers_timeout_unref
    handle.unref();
  }
  return handle;
};

const setTimeoutWithoutBlockingStopping = setLaterWithoutBlockingStopping(setTimeout);

// used by the polling monitor
let lastPollingRecordedAt;
let lastPollTimeout;

function recordPollingForMonitor() {
  lastPollingRecordedAt = Date.now();
}

let startPollingMonitorIfNotAlready = () => {
  const pollingMonitorTimeInterval = MAX_POLL_TIME * 1.1;
  console.log('pollModuleMap: setting up polling monitor to run every %ds', pollingMonitorTimeInterval / 1e3);

  function pollingMonitor() {
    console.log('pollModuleMap: running polling monitor');
    const monitorRunningAt = Date.now();
    const lastPollingTimeAgo = monitorRunningAt - lastPollingRecordedAt;
    if (lastPollingTimeAgo <= MAX_POLL_TIME) {
      console.log('pollModuleMap: polling is working as expected. Last poll: %dms ago, Max poll: %dms.', lastPollingTimeAgo, MAX_POLL_TIME);
      return;
    }

    console.warn('pollModuleMap: polling has unexpectedly stopped. Last poll: %dms ago, Max poll: %dms.', lastPollingTimeAgo, MAX_POLL_TIME);

    // something really unusual happened, re-start polling
    // ensure that the last timeout has actually stopped
    clearTimeout(lastPollTimeout);
    // make sure polling happens again
    // need the reference to use it, one needs to be defined first
    setImmediate(pollModuleMap); // eslint-disable-line no-use-before-define
    // log the restart
    console.warn('pollModuleMap: restarted polling');
    incrementCounter(holocronMetrics.moduleMapPollRestarted);
    // try to reset the next scheduled polling time to the minimum
    // should work, but if it doesn't we still want polling to occur
    // so schedule the polling restart first (above), then reset the time later (here)
    resetPollTime();
  }

  setLaterWithoutBlockingStopping(setInterval)(pollingMonitor, pollingMonitorTimeInterval);

  // noop from now on to save CPU
  startPollingMonitorIfNotAlready = () => {};
};

async function pollModuleMap() {
  // record module map poll first to reduce risk that polling monitor
  // triggers additional poll during current poll.
  recordPollingForMonitor();
  startPollingMonitorIfNotAlready();
  try {
    console.log('pollModuleMap: polling...');
    incrementCounter(holocronMetrics.moduleMapPoll);

    const { loadedModules = {}, rejectedModules = {} } = await loadModules();

    const numberOfModulesLoaded = Object.keys(loadedModules).length;
    const numberOfModulesRejected = Object.keys(rejectedModules).length;

    moduleMapHealthy = !numberOfModulesRejected;

    if (numberOfModulesLoaded) {
      console.log('pollModuleMap: %d modules loaded/updated:\n%o', numberOfModulesLoaded, loadedModules);
      incrementCounter(holocronMetrics.moduleMapUpdated);
    }

    if (numberOfModulesRejected) {
      const rejectedModuleMessages = Object.entries(rejectedModules).map(([moduleName, { reasonForRejection }]) => `${moduleName}: ${reasonForRejection}`);
      console.warn('pollModuleMap: %d modules rejected:\n%o', numberOfModulesRejected, rejectedModuleMessages);
      incrementGauge(holocronMetrics.moduleMapPollConsecutiveErrors);
    } else {
      resetGauge(holocronMetrics.moduleMapPollConsecutiveErrors);
    }

    if (numberOfModulesLoaded || numberOfModulesRejected) {
      resetPollTime();
    } else {
      incrementPollTime();
      console.log('pollModuleMap: no updates, looking again in %ds', Math.round(currentPollTime / 1e3));
    }
  } catch (pollingError) {
    try {
      resetPollTime();
      moduleMapHealthy = false;
      incrementGauge(holocronMetrics.moduleMapPollConsecutiveErrors);
      console.error('pollModuleMap: error polling', pollingError);
    } catch (resetPollTimeOrReportingErrorPollingError) {
      currentPollTime = MIN_POLL_TIME;
    }
  } finally {
    lastPollTimeout = setTimeoutWithoutBlockingStopping(pollModuleMap, currentPollTime);
  }
}

export default pollModuleMap;
