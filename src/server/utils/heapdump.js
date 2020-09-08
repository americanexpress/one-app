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
import fs from 'fs';
import v8 from 'v8';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipelinePromise = promisify(pipeline);

// --report-on-signal added which also listens on SIGUSR2 by default
// https://nodejs.org/api/report.html
// if someone is starting node with this option let them know about heapdumps
if (process.execArgv.includes('--report-on-signal')) {
  console.warn(
    '--report-on-signal listens for SIGUSR2 by default, be aware that SIGUSR2 also triggers heapdumps. Use --report-signal to avoid heapdump side-effects https://nodejs.org/api/report.html'
  );
}

process.on('SIGUSR2', async () => {
  const targetFilename = `/tmp/heapdump-${process.pid}-${Date.now()}.heapsnapshot`;
  console.warn(`about to write a heapdump to ${targetFilename}`);
  try {
    await pipelinePromise(
      v8.getHeapSnapshot(),
      fs.createWriteStream(targetFilename)
    );
  } catch (err) {
    console.error('unable to write heapdump', err);
    return;
  }
  console.warn(`wrote heapdump out to ${targetFilename}`);
});
