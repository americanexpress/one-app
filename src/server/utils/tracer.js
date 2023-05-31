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

// The NoOpTracer is a close variant to the Tracer and so is ok in this file
// eslint-disable-next-line max-classes-per-file
export class Tracer {
  #serverPhaseTimers;

  #fetchTimers;

  #requestStartArbitraryTimeNs;

  #requestStartTimeMs;

  #requestEndTimeNs;

  #fetchCount;

  constructor() {
    this.#serverPhaseTimers = {};
    this.#fetchTimers = {};
    this.#requestStartArbitraryTimeNs = process.hrtime.bigint();
    this.#requestStartTimeMs = Date.now();
    this.#requestEndTimeNs = null;

    // The fetch count helps the tracing of fetches by enumerating the keys.
    // This ensures if the server does make duplicate calls, both calls appear in the tracer
    this.#fetchCount = 0;
  }

  completeTraceAndLog = () => {
    this.#requestEndTimeNs = process.hrtime.bigint();

    console.log(`Trace: ${JSON.stringify(this.#formatTrace())} `);
  }

  // Start a timer for a server phase
  // There should only be server phase timer running at once
  /* The server phases are as follows
    * "1": addFrameOptionsHeader
    * "2": createRequestStoreMiddleware
    * "3": createRequestHtmlFragment -> createRoutes
    * "4": createRequestHtmlFragment -> checkRoutes
    * "5": createRequestHtmlFragment -> buildRenderProps
    * "6": createRequestHtmlFragment -> loadModuleData
    * "7": createRequestHtmlFragment -> renderToString
    * "8": conditionallyAllowCors
    * "9": checkStateForRedirect
    * "10": checkStateForStatusCode
    * "11": sendHtml
   */
  startServerPhaseTimer = (serverPhasekey) => {
    this.#serverPhaseTimers[serverPhasekey] = { startTimeNs: process.hrtime.bigint() };
  }

  // End a timer for a server phase
  endServerPhaseTimer = (serverPhasekey) => {
    this.#serverPhaseTimers[serverPhasekey].endTimeNs = process.hrtime.bigint();
  }

  // Start a timer for a fetch
  // Fetch timers should be wrapped closely around calls to fetch (use enhanceFetchWithTracer)
  // Since fetch's are asyncronous there can be more than one fetch timer running at once
  startFetchTimer = (key) => {
    this.#fetchTimers[key] = { startTimeNs: process.hrtime.bigint() };
  }

  // End a timer for a fetch.
  endFetchTimer = (key) => {
    this.#fetchTimers[key].endTimeNs = process.hrtime.bigint();
  }

  // End a timer for a fetch with an error
  endFetchTimerWithError = (key, error) => {
    this.endFetchTimer(key);
    this.#fetchTimers[key].error = error;
  }

  // increment the fetch count
  getAndIncrementFetchCount = () => {
    const previousCount = this.#fetchCount;
    this.#fetchCount += 1;
    return previousCount;
  }

  #nsToMs = (timeNs) => Number(timeNs / 1000000n);

  // Populate a timer record given a timer
  #buildRecord = (timer) => {
    const record = {};
    record.s = this.#nsToMs(timer.startTimeNs - this.#requestStartArbitraryTimeNs);
    if (timer.endTimeNs) {
      record.d = this.#nsToMs(timer.endTimeNs - timer.startTimeNs);
    }
    if (timer.error) {
      record.em = timer.error.message;
      record.es = timer.error.stack;
    }
    return record;
  }

  // Build the trace object
  #formatTrace = () => {
    const traceObject = {};
    traceObject.t = this.#requestStartTimeMs;
    traceObject.d = this.#nsToMs(this.#requestEndTimeNs - this.#requestStartArbitraryTimeNs);

    Object.keys(this.#serverPhaseTimers).forEach((serverPhaseKey) => {
      traceObject[serverPhaseKey] = this.#buildRecord(this.#serverPhaseTimers[serverPhaseKey]);
    });

    // don't attack empty fetch blocks
    const fetchTimerKeys = Object.keys(this.#fetchTimers);
    if (fetchTimerKeys.length > 0) {
      traceObject.f = {};
      fetchTimerKeys.forEach((fetchKey) => {
        traceObject.f[fetchKey] = this.#buildRecord(this.#fetchTimers[fetchKey]);
      });
    }

    return traceObject;
  }
}

// The NoOpTracer will be installed when the ONE_ENABLE_SERVER_TRACING env var is set to false.
// This allows the majority of the app to forgo constant checks to ONE_ENABLE_SERVER_TRACING.
// Instead, all parts of the system should 'trace' like normal
export class NoOpTracer {
  completeTraceAndLog = () => {}

  startServerPhaseTimer = () => {}

  endServerPhaseTimer = () => {}

  startFetchTimer = () => {}

  endFetchTimer = () => {}

  endFetchTimerWithError = () => {}

  getAndIncrementFetchCount = () => {}
}

// Express middleware to create a new trace and attach it to the request object
// This should be the very first middleware in a request you wish to trace
export const initializeTracer = (req, res, next) => {
  if (process.env.ONE_ENABLE_SERVER_TRACING === 'true' || process.env.NODE_ENV === 'development') {
    req.tracer = new Tracer();
  } else {
    // install the NoOpTracer, so nothing else needs to check ONE_ENABLE_SERVER_TRACING
    req.tracer = new NoOpTracer();
  }

  next();
};

// Express middleware complete a trace and log it
// This should be the very last middleware in a request you wish to trace
export const completeTracer = (req, res, next) => {
  req.tracer.completeTraceAndLog();
  next();
};

// middleware enhancer to trace how long the middleware took
export const traceMiddleware = (middleware, serverPhaseKey) => async (req, res, next) => {
  req.tracer.startServerPhaseTimer(serverPhaseKey);
  return middleware(req, res, () => {
    req.tracer.endServerPhaseTimer(serverPhaseKey);
    next();
  });
};

// fetch enhancer to add fetch tracing around api calls
export const enhanceFetchWithTracer = (req, fetch) => async (...params) => {
  const localFetchCount = req.tracer.getAndIncrementFetchCount();
  req.tracer.startFetchTimer(`${localFetchCount} ${params[0]}`);
  try {
    const response = await fetch(...params);
    req.tracer.endFetchTimer(`${localFetchCount} ${params[0]}`);
    return response;
  } catch (error) {
    req.tracer.endFetchTimerWithError(`${localFetchCount} ${params[0]}`, error);
    throw error;
  }
};
