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
  serverEndTimer = ({ key, message }) => {
    const timeNs = process.hrtime.bigint();
    this.timerRecords[key] = {
      message,
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

    synopsys.message = record.message;
    synopsys.timerDurationNs = record.timerEndNs - record.timerStartNs;
    synopsys.timerDurationMs = synopsys.timerDurationNs / 1000000n;
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

    const totalTimersNs = Object.values(timersSynopsys).reduce(
      (acc, timerSynopsys) => acc + timerSynopsys.timerDurationNs, 0n
    );

    const totalDurationNs = this.requestEndTimeNs - this.requestStartTimeNs;
    const totalDurationMs = totalDurationNs / 1000000n;

    const serverDurationNs = this.requestEndTimeNs - this.requestStartTimeNs - totalTimersNs;
    const serverDurationMs = serverDurationNs / 1000000n;

    return {
      totalDurationNs,
      totalDurationMs,
      serverDurationNs,
      serverDurationMs,
      timersSynopsys,
      fetchSynopsys,
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

  console.log('Trace:', req.tracer.formatTrace());

  next();
};

// fetch enhancer to add fetch tracing around api calls
export const enhanceFetchWithTracer = (tracer, fetch) => async (...params) => {
  tracer.serverStartFetchTimer({ key: params[0] });
  const response = await fetch(...params);
  tracer.serverEndFetchTimer({ key: params[0] });
  return response;
};
