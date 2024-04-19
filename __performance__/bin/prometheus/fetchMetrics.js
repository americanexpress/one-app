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
const fs = require('node:fs/promises');
const metrics = require('./metrics');
const getResultDir = require('../util/getResultDir');

async function getPromData({ start, end, testId }) {
  const promData = {};
  for (const query of Object.keys(metrics)) {
    const response = await fetch(`http://localhost:9090/api/v1/query_range?query=${query}&start=${start}&end=${end}&step=1s`);
    const { data } = await response.json();
    try {
      promData[query] = data.result[0].values.map(([, value]) => Number.parseFloat(value));
    } catch (e) {
      console.error(`Error fetching ${query}: ${e.message}`);
      console.error(data);
    }
  }
  await fs.writeFile(path.join(getResultDir(testId), 'metrics-prom.json'), JSON.stringify(promData, null, 2));
  return promData;
}

module.exports = getPromData;
