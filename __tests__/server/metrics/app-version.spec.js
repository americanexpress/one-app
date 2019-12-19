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

describe('app-version', () => {
  let createGauge;
  let setGauge;

  function load(isRc = false) {
    jest.resetModules();

    if (isRc) {
      jest.mock('../../../src/server/utils/readJsonFile', () => () => ({ buildVersion: '1.2.3-rc.0-abc123' }));
    } else {
      jest.mock('../../../src/server/utils/readJsonFile', () => () => ({ buildVersion: '1.2.3-abc123' }));
    }

    jest.mock('../../../src/server/metrics/gauges');
    ({ createGauge, setGauge } = require('../../../src/server/metrics/gauges'));

    return require('../../../src/server/metrics/app-version').default;
  }

  it('creates a gauge named info', () => {
    load();
    expect(createGauge).toHaveBeenCalledTimes(1);
    expect(createGauge.mock.calls[0]).toMatchSnapshot();
  });

  it('sets the version label of the info gague', () => {
    load();
    expect(setGauge).toHaveBeenCalledTimes(1);
    expect(setGauge.mock.calls[0][0]).toMatch(/_version_info$/);
    expect(setGauge.mock.calls[0][1]).toHaveProperty('version', '1.2.3-abc123');
  });

  it('sets the major label of the info gague', () => {
    load();
    expect(setGauge).toHaveBeenCalledTimes(1);
    expect(setGauge.mock.calls[0][0]).toMatch(/_version_info$/);
    expect(setGauge.mock.calls[0][1]).toHaveProperty('major', 1);
  });

  it('sets the minor label of the info gague', () => {
    load();
    expect(setGauge).toHaveBeenCalledTimes(1);
    expect(setGauge.mock.calls[0][0]).toMatch(/_version_info$/);
    expect(setGauge.mock.calls[0][1]).toHaveProperty('minor', 2);
  });

  it('sets the patch label of the info gague', () => {
    load();
    expect(setGauge).toHaveBeenCalledTimes(1);
    expect(setGauge.mock.calls[0][0]).toMatch(/_version_info$/);
    expect(setGauge.mock.calls[0][1]).toHaveProperty('patch', 3);
  });

  it('sets the prerelease label of the info gague to null when not present', () => {
    load();
    expect(setGauge).toHaveBeenCalledTimes(1);
    expect(setGauge.mock.calls[0][0]).toMatch(/_version_info$/);
    expect(setGauge.mock.calls[0][1]).toHaveProperty('prerelease', null);
  });

  it('sets the prerelease label of the info gague when present', () => {
    load(true);
    expect(setGauge).toHaveBeenCalledTimes(1);
    expect(setGauge.mock.calls[0][0]).toMatch(/_version_info$/);
    expect(setGauge.mock.calls[0][1]).toHaveProperty('prerelease', 'rc.0');
  });

  it('sets the build label of the info gague', () => {
    load();
    expect(setGauge).toHaveBeenCalledTimes(1);
    expect(setGauge.mock.calls[0][0]).toMatch(/_version_info$/);
    expect(setGauge.mock.calls[0][1]).toHaveProperty('build', 'abc123');
  });

  it('exports the metric names', () => {
    expect(load()).toMatchSnapshot();
  });
});
