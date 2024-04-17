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

const { nth } = require('./format');

function sum(data) {
  return data.reduce((acc, value) => acc + value, 0);
}
sum.label = 'Total';
sum.description = 'sum total of all data points in the set';

function mean(data) {
  return sum(data) / data.length;
}
mean.label = 'Average';
mean.description = 'arithmetic mean of the data set';

function median(data) {
  const sorted = data.sort((a, b) => a - b);
  return (sorted[Math.floor((data.length - 1) / 2)] + sorted[Math.ceil((data.length - 1) / 2)]) / 2;
}
median.label = 'Median';
median.description = 'middle value (or midpoint) after all data points have been arranged in value order';

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
mode.description = 'the value that appears the most frequently in the data set';

function min(data) {
  return Math.min(...data);
}
min.label = 'Min';
min.description = 'smallest value in the data set';

function max(data) {
  return Math.max(...data);
}
max.label = 'Max';
max.description = 'largest value in the data set';

function createPercentile(p) {
  function percentile(data) {
    return data.sort((a, b) => a - b)[Math.floor(data.length * (p / 100)) - 1];
  }
  percentile.label = `${nth(p)} Percentile`;
  percentile.description = `the value below which ${p}% of the data set falls`;
  return percentile;
}

const p95 = createPercentile(95);

const p90 = createPercentile(90);

module.exports = {
  sum,
  mean,
  median,
  mode,
  min,
  max,
  p95,
  p90,
};
