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

// NODE_HEAPDUMP_OPTIONS=nosignal by default in server/config/env/runTime
let heapdump;
try {
  // binary might not be compatible for non-docker distributions
  heapdump = require('heapdump'); // eslint-disable-line global-require, import/no-extraneous-dependencies, import/no-unresolved
} catch (err) {
  console.warn(
    'unable to setup writing heapdumps',
    process.env.NODE_ENV === 'development' ? err.message : err
  );
}

if (heapdump && process.env.NODE_HEAPDUMP_OPTIONS === 'nosignal') {
  process.on('SIGUSR2', () => {
    const targetFilename = `/tmp/heapdump-${process.pid}-${Date.now()}.heapsnapshot`;
    console.warn(`about to write a heapdump to ${targetFilename}`);
    heapdump.writeSnapshot(targetFilename, (err, writtenFilename) => {
      if (err) {
        console.error(`unable to write heapdump ${writtenFilename}`, err);
      } else {
        console.warn(`wrote heapdump out to ${writtenFilename}`);
      }
    });
  });
}
