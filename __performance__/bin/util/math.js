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

function sum(data) {
  return data.reduce((acc, value) => acc + value, 0);
}
sum.label = 'Total';

function mean(data) {
  return sum(data) / data.length;
}
mean.label = 'Average';

function median(data) {
  const sorted = data.sort((a, b) => a - b);
  return (sorted[Math.floor((data.length - 1) / 2)] + sorted[Math.ceil((data.length - 1) / 2)]) / 2;
}
median.label = 'Median';

function mode(data) {
  const frequencyMap = {};
  let maxFreq = 0;
  let result;
  for (const item of data) {
    frequencyMap[item] = ++frequencyMap[item] || 1;
    if (frequencyMap[item] > maxFreq) {
      maxFreq = frequencyMap[item];
      result = item;
    }
  }
  return result;
}
mode.label = 'Mode';

function min(data) {
  return Math.min(...data);
}
min.label = 'Min';

function max(data) {
  return Math.max(...data);
}
max.label = 'Max';

function percentile(p) {
  return (data) => data.sort((a, b) => a - b)[Math.floor(data.length * (p / 100)) - 1];
}

const p95 = percentile(95);
p95.label = '95th Percentile';

const p90 = percentile(90);
p90.label = '90th Percentile';

module.exports = {
  sum,
  mean,
  median,
  mode,
  min,
  max,
  percentile,
  p95,
  p90,
};
