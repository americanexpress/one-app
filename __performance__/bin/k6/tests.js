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

function describe({ scenario, about, link }) {
  return [`${bold('Scenario:')} ${scenario}`, `${bold('About:')} ${about}`, underline(link)];
}

module.exports.load = {
  label: 'Load Test',
  description: describe({
    scenario: 'Up to 400 looping VUs for 20m0s over 3 stages',
    about: 'Load Testing is primarily concerned with assessing the current performance of your system in terms of concurrent users or requests per second.',
    link: 'https://k6.io/docs/test-types/load-testing',
  }),
  target: 'TARGET_URL',
  script: '/scripts/load.js',
};

module.exports.smoke = {
  label: 'Smoke Test',
  description: describe({
    scenario: '1 looping VUs for 1m0s',
    about: 'Smoke test is a regular load test, configured for minimal load. You want to run a smoke test as a sanity check every time you write a new script or modify an existing script.',
    link: 'https://k6.io/docs/test-types/smoke-testing',
  }),
  target: 'TARGET_URL',
  script: '/scripts/smoke.js',
};

module.exports.soak = {
  label: 'Soak Test',
  description: describe({
    scenario: 'Up to 100 looping VUs for 12h20m0s over 3 stages',
    about: 'Soak testing is concerned with reliability over a long time.',
    link: 'https://k6.io/docs/test-types/soak-testing',
  }),
  target: 'TARGET_URL',
  script: '/scripts/soak.js',
};

module.exports.spike = {
  label: 'Spike Test',
  description: describe({
    scenario: 'Up to 600 looping VUs for 3m40s over 7 stages',
    about: 'Spike test is a variation of a stress test, but it does not gradually increase the load, instead it spikes to extreme load over a very short window of time. While a stress test allows the SUT (System Under Test) to gradually scale up its infrastructure, a spike test does not.',
    link: 'https://k6.io/docs/test-types/stress-testing#spike-testing',
  }),
  target: 'TARGET_BASE_URL',
  script: '/scripts/spike.js',
};

module.exports.stress = {
  label: 'Stress Test',
  description: describe({
    scenario: 'Up to 500 looping VUs for 38m0s over 9 stages',
    about: 'The purpose of stress testing is to assess the availability and stability of the system under heavy load.',
    link: 'https://k6.io/docs/test-types/stress-testing',
  }),
  target: 'TARGET_BASE_URL',
  script: '/scripts/stress.js',
};
