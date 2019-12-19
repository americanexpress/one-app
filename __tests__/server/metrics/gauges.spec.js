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

describe('gauges', () => {
  let Gauge;

  function load() {
    jest.resetModules();

    jest.mock('prom-client');
    ({ Gauge } = require('prom-client'));

    return require('../../../src/server/metrics/gauges');
  }

  describe('createGauge', () => {
    it('is a function', () => {
      const { createGauge } = load();
      expect(createGauge).toBeInstanceOf(Function);
    });

    it('creates a gauge with the options', () => {
      const { createGauge } = load();
      createGauge({ name: 'yup' });
      expect(Gauge).toHaveBeenCalledTimes(1);
      const gauge = Gauge.mock.instances[0];
      expect(gauge).toBeInstanceOf(Gauge);
    });

    it('does not create a new gauge if one with the same name already exists', () => {
      const { createGauge } = load();
      createGauge({ name: 'yup' });
      expect(Gauge).toHaveBeenCalledTimes(1);
      createGauge({ name: 'yup' });
      expect(Gauge).toHaveBeenCalledTimes(1);
    });
  });

  describe('incrementGauge', () => {
    it('is a function', () => {
      const { incrementGauge } = load();
      expect(incrementGauge).toBeInstanceOf(Function);
    });

    it('throws an error if the gauge does not exist', () => {
      const { incrementGauge } = load();
      expect(() => incrementGauge('nope')).toThrowErrorMatchingSnapshot();
    });

    it('calls the inc method of the gauge', () => {
      const { createGauge, incrementGauge } = load();
      createGauge({ name: 'yup' });
      const gauge = Gauge.mock.instances[0];
      incrementGauge('yup');
      expect(gauge.inc).toHaveBeenCalledTimes(1);
    });

    it('calls the inc method of the gauge with the arguments', () => {
      const { createGauge, incrementGauge } = load();
      createGauge({ name: 'yup' });
      const gauge = Gauge.mock.instances[0];
      incrementGauge('yup', 1, 'two', [null, null, null]);
      expect(gauge.inc).toHaveBeenCalledTimes(1);
      expect(gauge.inc).toHaveBeenCalledWith(1, 'two', [null, null, null]);
    });
  });

  describe('setGauge', () => {
    it('is a function', () => {
      const { setGauge } = load();
      expect(setGauge).toBeInstanceOf(Function);
    });

    it('throws an error if the gauge does not exist', () => {
      const { setGauge } = load();
      expect(() => setGauge('nope')).toThrowErrorMatchingSnapshot();
    });

    it('calls the set method of the gauge', () => {
      const { createGauge, setGauge } = load();
      createGauge({ name: 'yup' });
      const gauge = Gauge.mock.instances[0];
      setGauge('yup');
      expect(gauge.set).toHaveBeenCalledTimes(1);
    });

    it('calls the set method of the gauge with the arguments', () => {
      const { createGauge, setGauge } = load();
      createGauge({ name: 'yup' });
      const gauge = Gauge.mock.instances[0];
      setGauge('yup', 1, 'two', [null, null, null]);
      expect(gauge.set).toHaveBeenCalledTimes(1);
      expect(gauge.set).toHaveBeenCalledWith(1, 'two', [null, null, null]);
    });
  });

  describe('resetGauge', () => {
    it('is a function', () => {
      const { resetGauge } = load();
      expect(resetGauge).toBeInstanceOf(Function);
    });

    it('throws an error if the gauge does not exist', () => {
      const { resetGauge } = load();
      expect(() => resetGauge('nope')).toThrowErrorMatchingSnapshot();
    });

    it('calls the reset method of the gauge', () => {
      const { createGauge, resetGauge } = load();
      createGauge({ name: 'yup' });
      const gauge = Gauge.mock.instances[0];
      resetGauge('yup');
      expect(gauge.reset).toHaveBeenCalledTimes(1);
    });

    it('calls the reset method of the gauge with the arguments', () => {
      const { createGauge, resetGauge } = load();
      createGauge({ name: 'yup' });
      const gauge = Gauge.mock.instances[0];
      resetGauge('yup', 1, 'two', [null, null, null]);
      expect(gauge.reset).toHaveBeenCalledTimes(1);
      expect(gauge.reset).toHaveBeenCalledWith(1, 'two', [null, null, null]);
    });
  });
});
