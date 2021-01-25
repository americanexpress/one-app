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

import * as appVersion from '../../../src/server/metrics/app-version';
import holocron from '../../../src/server/metrics/holocron';
import intlCache from '../../../src/server/metrics/intl-cache';

import * as index from '../../../src/server/metrics';

jest.mock('../../../src/server/metrics/app-version', () => ({ appVersion: 'app-version' }));
jest.mock('../../../src/server/metrics/holocron', () => ({ holcron: 'holocron' }));
jest.mock('../../../src/server/metrics/intl-cache', () => ({ intlCache: 'intl-cache' }));

describe('index', () => {
  // counters
  it('does not export createCounter', () => expect(index).not.toHaveProperty('createCounter'));

  it('exports incrementCounter', () => {
    expect(index).toHaveProperty('incrementCounter');
    expect(index.incrementCounter).toBeInstanceOf(Function);
  });

  // gauges
  it('does not export createGauge', () => expect(index).not.toHaveProperty('createGauge'));

  it('exports incrementGauge', () => {
    expect(index).toHaveProperty('incrementGauge');
    expect(index.incrementGauge).toBeInstanceOf(Function);
  });

  it('exports setGauge', () => {
    expect(index).toHaveProperty('setGauge');
    expect(index.setGauge).toBeInstanceOf(Function);
  });

  it('exports resetGauge', () => {
    expect(index).toHaveProperty('resetGauge');
    expect(index.resetGauge).toBeInstanceOf(Function);
  });

  // metrics
  it('exports appVersion', () => expect(index).toHaveProperty('appVersion', appVersion));

  it('exports holocron', () => expect(index).toHaveProperty('holocron', holocron));

  it('exports intlCache', () => expect(index).toHaveProperty('intlCache', intlCache));
});
