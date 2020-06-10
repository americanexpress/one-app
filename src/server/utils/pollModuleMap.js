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
import {
  getModulesUsingExternals,
  setModulesUsingExternals,
} from './onModuleLoad';
import { backupModuleStateConfig, restoreModuleStateConfig } from './stateConfig';

let moduleMapHealthy = null;
export const getModuleMapHealth = () => moduleMapHealthy;

export const MIN_POLL_TIME = Math.max(
  process.env.ONE_MAP_POLLING_MIN
    ? parseInt(process.env.ONE_MAP_POLLING_MIN, 10) * 1e3
    : 0,
  1e3 * 5 // 5s
);

export const MAX_POLL_TIME = process.env.ONE_MAP_POLLING_MAX
  ? parseInt(process.env.ONE_MAP_POLLING_MAX, 10) * 1e3
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

function recordPollingForMonitor() {
  lastPollingRecordedAt = Date.now();
}

let startPollingMonitorIfNotAlready = () => {
  const pollingMonitorTimeInterval = MAX_POLL_TIME * 1.1;
  console.log(`pollModuleMap: setting up polling monitor to run every ${pollingMonitorTimeInterval / 1e3}s`);

  function pollingMonitor() {
    console.log('pollModuleMap: running polling monitor');
    const monitorRunningAt = Date.now();
    const lastPollingTimeAgo = monitorRunningAt - lastPollingRecordedAt;
    if (lastPollingTimeAgo <= MAX_POLL_TIME) {
      console.log(
        `pollModuleMap: polling is working as expected. Last poll: ${lastPollingTimeAgo}ms ago, Max poll: ${MAX_POLL_TIME}ms.`
      );
      return;
    }

    console.warn(
      `pollModuleMap: polling has unexpectedly stopped. Last poll: ${lastPollingTimeAgo}ms ago, Max poll: ${MAX_POLL_TIME}ms.`
    );
    // something really unusual happened, re-start polling
    // first, make sure polling happens again
    // need the reference to use it, one needs to be defined first
    setImmediate(pollModuleMap); // eslint-disable-line no-use-before-define
    // log the restart
    console.warn('pollModuleMap: restarted polling');
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
  startPollingMonitorIfNotAlready();
  let modulesUsingExternalsBeforeUpdate;
  let configBeforeUpdate;

  try {
    configBeforeUpdate = backupModuleStateConfig();
    modulesUsingExternalsBeforeUpdate = getModulesUsingExternals();
    console.log('pollModuleMap: polling...');
    incrementCounter(holocronMetrics.moduleMapPoll);
    recordPollingForMonitor();

    const modulesLoaded = await loadModules();

    moduleMapHealthy = true;
    resetGauge(holocronMetrics.moduleMapPollConsecutiveErrors);
    const numberOfModulesLoaded = Object.keys(modulesLoaded).length;
    if (numberOfModulesLoaded) {
      console.log(
        `pollModuleMap: ${numberOfModulesLoaded} modules loaded/updated:`,
        modulesLoaded
      );
      resetPollTime();
    } else {
      incrementPollTime();
      console.log(
        `pollModuleMap: no updates, looking again in ${Math.round(currentPollTime / 1e3)}s`
      );
    }
  } catch (pollingError) {
    try {
      restoreModuleStateConfig(configBeforeUpdate);
      if (modulesUsingExternalsBeforeUpdate) {
        setModulesUsingExternals(modulesUsingExternalsBeforeUpdate);
      }
      resetPollTime();
      moduleMapHealthy = false;
      incrementGauge(holocronMetrics.moduleMapPollConsecutiveErrors);
      console.error('pollModuleMap: error polling', pollingError);
    } catch (resetPollTimeOrReportingErrorPollingError) {
      currentPollTime = MIN_POLL_TIME;
    }
  } finally {
    setTimeoutWithoutBlockingStopping(pollModuleMap, currentPollTime);
  }
}

export default pollModuleMap;
