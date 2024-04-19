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

const fs = require('node:fs/promises');
const path = require('node:path');

async function readResults(resultsDir) {
  const [k6, prom, summary] = (await Promise.all([
    fs.readFile(path.join(resultsDir, 'metrics-k6.json')),
    fs.readFile(path.join(resultsDir, 'metrics-prom.json')),
    fs.readFile(path.join(resultsDir, 'k6-summary.json')),
  ])).map(JSON.parse);

  return {
    data: { ...k6, ...prom },
    summary,
    get meta() {
      return summary.meta;
    },
  };
}

module.exports = readResults;
