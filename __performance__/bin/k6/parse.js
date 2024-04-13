/*
 * Copyright 2024 American Express Travel Related Services Company, Inc.
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

const path = require('node:path');
const fs = require('node:fs');
const split2 = require('split2');
const getResultDir = require('../util/getResultDir');
const createDeferred = require('../util/createDeferred');

function k6parse({ testId }) {
  const resultDir = getResultDir(testId);
  const deferred = createDeferred();
  let start;
  let end;
  const k6resultsStream = fs.ReadStream(path.join(resultDir, 'k6-out.json')).pipe(split2(JSON.parse));

  const k6metrics = {};

  k6resultsStream.on('data', (data) => {
    if (data.type !== 'Point') return;
    if (!start) start = data.data.time;
    end = data.data.time;
    if (!k6metrics[data.metric]) k6metrics[data.metric] = [];
    k6metrics[data.metric].push(data.data.value);
  });

  k6resultsStream.on('end', async () => {
    await fs.promises.writeFile(path.join(resultDir, 'metrics-k6.json'), JSON.stringify(k6metrics, null, 2));
    const summary = JSON.parse(await fs.promises.readFile(path.join(resultDir, 'k6-summary.json')));
    summary.meta.start = start;
    summary.meta.end = end;
    await fs.promises.writeFile(path.join(resultDir, 'k6-summary.json'), JSON.stringify(summary, null, 2));
    deferred.resolve({ start, end });
  });

  return deferred;
}

module.exports = k6parse;
