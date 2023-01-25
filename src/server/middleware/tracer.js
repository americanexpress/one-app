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

class Tracer {
  constructor() {
    this.timerRecords = {};
    this.fetchRecords = {};
    this.timers = {};
    this.requestStartTimeNs = process.hrtime.bigint();
    this.requestEndTimeNs = null;
  }

  completeTrace = () => {
    this.requestEndTimeNs = process.hrtime.bigint();
  }

  // start a timer. Timers should only be used for tracing things that block the main thread
  // There should only be one timer running at once.
  serverStartTimer = ({ key }) => {
    this.timers[key] = process.hrtime.bigint();
  }

  // end a timer and create a record out of it
  serverEndTimer = ({ key }) => {
    const timeNs = process.hrtime.bigint();
    this.timerRecords[key] = {
      timerStartNs: this.timers[key],
      timerEndNs: timeNs,
    };
  }

  // Fetch timers should be wrapped closely around calls to fetch (use enhanceFetchWithTracer)
  // Since fetch's are asyncronous there can be more than one fetch timer running at once.
  serverStartFetchTimer = this.serverStartTimer;

  // end a fetch and create a record out of it
  serverEndFetchTimer = ({ key }) => {
    const timeNs = process.hrtime.bigint();
    this.fetchRecords[key] = {
      message: key,
      timerStartNs: this.timers[key],
      timerEndNs: timeNs,
    };
  }

  // Add some more useful fields to the records
  buildSynopsys = (record) => {
    const synopsys = {};

    synopsys.timerDurationMs = Number((record.timerEndNs - record.timerStartNs) / 1000000n);
    synopsys.timerStartMs = Number(record.timerStartNs / 1000000n);
    synopsys.timerEndMs = Number(record.timerEndNs / 1000000n);
    return synopsys;
  }

  // collect all trace information into a single object for logging
  formatTrace = () => {
    const timersSynopsys = {};
    const fetchSynopsys = {};

    Object.keys(this.timerRecords).forEach((recordKey) => {
      timersSynopsys[recordKey] = this.buildSynopsys(this.timerRecords[recordKey]);
    });
    Object.keys(this.fetchRecords).forEach((recordKey) => {
      fetchSynopsys[recordKey] = this.buildSynopsys(this.fetchRecords[recordKey]);
    });

    const totalTimersMs = Object.values(timersSynopsys).reduce(
      (acc, timerSynopsys) => acc + timerSynopsys.timerDurationMs, 0
    );

    const totalDurationMs = Number((this.requestEndTimeNs - this.requestStartTimeNs) / 1000000n);

    const serverDurationMs = totalDurationMs - totalTimersMs;

    const sortedFetchSynopsys = {};

    const sortedFetchKeys = Object.keys(fetchSynopsys).sort((aKey, bKey) => (
      fetchSynopsys[bKey].timerDurationMs - fetchSynopsys[aKey].timerDurationMs
    ));

    sortedFetchKeys.forEach((key) => {
      sortedFetchSynopsys[key] = fetchSynopsys[key];
    });

    return {
      // totalDurationNs,
      totalDurationMs,
      // serverDurationNs,
      serverDurationMs,
      timersSynopsys,
      fetchSynopsys: sortedFetchSynopsys,
    };
  }
}

// Express middleware to create a new trace and attach it to the request object
export const initializeTracer = (req, res, next) => {
  req.tracer = new Tracer();

  next();
};

// Express middleware complete a trace and log it
export const completeTracer = (req, res, next) => {
  req.tracer.completeTrace();

  console.log('Trace:');
  console.log(JSON.stringify(req.tracer.formatTrace(), null, 2));

  next();
};

// fetch enhancer to add fetch tracing around api calls
export const enhanceFetchWithTracer = (tracer, fetch) => async (...params) => {
  tracer.serverStartFetchTimer({ key: params[0] });
  const response = await fetch(...params);
  tracer.serverEndFetchTimer({ key: params[0] });
  return response;
};

// middleware enhancer to trace how long the middleware took
export const traceMiddleware = (middleware) => async (req, res, next) => {
  req.tracer.serverStartTimer({ key: middleware.name });
  return middleware(req, res, () => {
    req.tracer.serverEndTimer({ key: middleware.name });
    next();
  });
};
