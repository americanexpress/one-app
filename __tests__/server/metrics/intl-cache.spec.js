/*
 * Copyright 2021 American Express Travel Related Services Company, Inc.
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

jest.mock('@americanexpress/one-app-ducks/lib/intl/server-cache', () => ({
  getEstimatedSize: jest.fn(() => 'mocked'),
}));

describe('intl-cache', () => {
  let createGauge;
  let setGauge;

  function load() {
    jest.resetModules();

    // jest.mock('../../../package.json', () => ({ version: '1.2.3' }));
    jest.mock('../../../src/server/metrics/counters');

    jest.mock('../../../src/server/metrics/gauges');
    ({ createGauge, setGauge } = require('../../../src/server/metrics/gauges'));

    return require('../../../src/server/metrics/intl-cache');
  }

  it('creates a gauge named size', () => {
    load();
    expect(createGauge).toHaveBeenCalled();
    expect(createGauge.mock.calls[0][0]).toHaveProperty('name');
    expect(createGauge.mock.calls[0][0].name).toMatch('size');
    expect(createGauge.mock.calls[0]).toMatchSnapshot();
  });

  it('exports the metric names', () => {
    expect(load()).toMatchSnapshot();
  });

  describe('cacheSizeCollector', () => {
    it('updates gauge to include estimated size', () => {
      const { cacheSizeCollector } = load();
      cacheSizeCollector();
      expect(setGauge).toHaveBeenCalledWith('oneapp_intl_cache_size_total', 'mocked');
    });
  });
});
