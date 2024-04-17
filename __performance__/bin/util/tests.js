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

const { bold, underline } = require('colorette');

module.exports.load = {
  label: 'Load Test',
  description: [
    `${bold('Scenario:')} Up to 400 looping VUs for 20m0s over 3 stages`,
    `${bold('About:')} Load Testing is primarily concerned with assessing the current performance of your system in terms of concurrent users or requests per second.`,
    underline('https://k6.io/docs/test-types/load-testing'),
  ],
};

module.exports.smoke = {
  label: 'Smoke Test',
  description: [
    `${bold('Scenario:')} 1 looping VUs for 1m0s`,
    `${bold('About:')} Smoke test is a regular load test, configured for minimal load. You want to run a smoke test as a sanity check every time you write a new script or modify an existing script.`,
    underline('https://k6.io/docs/test-types/smoke-testing'),
  ],
};

module.exports.soak = {
  label: 'Soak Test',
  description: [
    `${bold('Scenario:')} Up to 100 looping VUs for 12h20m0s over 3 stages`,
    `${bold('About:')} Soak testing is concerned with reliability over a long time.`,
    underline('https://k6.io/docs/test-types/soak-testing'),
  ],
};

module.exports.spike = {
  label: 'Spike Test',
  description: [
    `${bold('Scenario:')} Up to 600 looping VUs for 3m40s over 7 stages`,
    `${bold('About:')} Spike test is a variation of a stress test, but it does not gradually increase the load, instead it spikes to extreme load over a very short window of time. While a stress test allows the SUT (System Under Test) to gradually scale up its infrastructure, a spike test does not.`,
    underline('https://k6.io/docs/test-types/stress-testing#spike-testing'),
  ],
};

module.exports.stress = {
  label: 'Stress Test',
  description: [
    `${bold('Scenario:')} Up to 500 looping VUs for 38m0s over 9 stages`,
    `${bold('About:')} The purpose of stress testing is to assess the availability and stability of the system under heavy load.`,
    underline('https://k6.io/docs/test-types/stress-testing'),
  ],
};
