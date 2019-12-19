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

describe('holocron', () => {
  let createCounter;
  let createGauge;

  function load() {
    jest.resetModules();

    jest.mock('../../../package.json', () => ({ version: '1.2.3' }));

    jest.mock('../../../src/server/metrics/counters');
    ({ createCounter } = require('../../../src/server/metrics/counters'));

    jest.mock('../../../src/server/metrics/gauges');
    ({ createGauge } = require('../../../src/server/metrics/gauges'));

    return require('../../../src/server/metrics/holocron');
  }

  it('creates a counter named module_map_poll', () => {
    load();
    expect(createCounter).toHaveBeenCalled();
    expect(createCounter.mock.calls[0][0]).toHaveProperty('name');
    expect(createCounter.mock.calls[0][0].name).toMatch('module_map_poll');
    expect(createCounter.mock.calls[0]).toMatchSnapshot();
  });

  it('creates a gauge named module_map_poll_wait', () => {
    load();
    expect(createGauge).toHaveBeenCalled();
    expect(createGauge.mock.calls[0][0]).toHaveProperty('name');
    expect(createGauge.mock.calls[0][0].name).toMatch('module_map_poll_wait');
    expect(createGauge.mock.calls[0]).toMatchSnapshot();
  });

  it('creates a gauge named module_map_poll_consecutive_errors', () => {
    load();
    expect(createGauge).toHaveBeenCalled();
    expect(createGauge.mock.calls[1][0]).toHaveProperty('name');
    expect(createGauge.mock.calls[1][0].name).toMatch('module_map_poll_consecutive_errors');
    expect(createGauge.mock.calls[1]).toMatchSnapshot();
  });

  it('exports the metric names', () => {
    expect(load()).toMatchSnapshot();
  });
});
