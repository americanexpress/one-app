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

// some timing helpers
function startTimer(obj) {
  // attach the data to the request for later use, similar to
  // https://github.com/expressjs/morgan/blob/1533cdcc512f4daf20a93cb0ab3b18d6563a897f/index.js#L491
  /* eslint-disable no-param-reassign, no-underscore-dangle */
  obj._startAt = process.hrtime();
  obj._startTime = new Date().toISOString();
  /* eslint-enable no-param-reassign, no-underscore-dangle */
}

function measureTime(prev) {
  // see `startTimer(...)` for justification
  const previousHrtime = prev._startAt; // eslint-disable-line no-underscore-dangle
  if (!Array.isArray(previousHrtime)) {
    return undefined;
  }
  const diff = process.hrtime(previousHrtime);
  return (diff[0] * 1e3) + (diff[1] * 1e-6); // ms
}

export {
  startTimer,
  measureTime,
};
