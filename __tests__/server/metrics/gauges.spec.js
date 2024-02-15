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

/* eslint-disable no-underscore-dangle -- prom-client uses dangling underscore */

describe('gauges', () => {
  let Gauge;
  let register;

  function load() {
    jest.resetModules();
    ({ Gauge, register } = require('prom-client'));
    return require('../../../src/server/metrics/gauges');
  }

  describe('createGauge', () => {
    it('is a function', () => {
      const { createGauge } = load();
      expect(createGauge).toBeInstanceOf(Function);
    });

    it('creates a gauge with the options', () => {
      const { createGauge } = load();
      expect(register._metrics).toEqual({});
      createGauge({ name: 'yup', help: 'yup_help' });
      const gauge = register._metrics.yup;
      expect(gauge).toBeInstanceOf(Gauge);
    });

    it('does not create a new gauge if one with the same name already exists', () => {
      const { createGauge } = load();
      expect(register._metrics).toEqual({});
      createGauge({ name: 'yup', help: 'yup_help' });
      const gauge = register._metrics.yup;
      createGauge({ name: 'yup', help: 'yup_help' });
      expect(register._metrics.yup).toBe(gauge);
    });
  });

  describe('incrementGauge', () => {
    it('is a function', () => {
      const { incrementGauge } = load();
      expect(incrementGauge).toBeInstanceOf(Function);
    });

    it('throws an error if the gauge does not exist', () => {
      const { incrementGauge } = load();
      expect(() => incrementGauge('nope')).toThrowErrorMatchingInlineSnapshot(
        '"unable to find gauge nope, please create it first"'
      );
    });

    it('calls the inc method of the gauge', () => {
      const { createGauge, incrementGauge } = load();
      createGauge({ name: 'yup', help: 'yup_help' });
      const gauge = register._metrics.yup;
      expect(gauge.hashMap[''].value).toBe(0);
      incrementGauge('yup');
      expect(gauge.hashMap[''].value).toBe(1);
      incrementGauge('yup', 2);
      expect(gauge.hashMap[''].value).toBe(3);
    });

    it('calls the inc method of the gauge with the arguments', () => {
      const { createGauge, incrementGauge } = load();
      createGauge({ name: 'yup', help: 'yup_help', labelNames: ['foo'] });
      const gauge = register._metrics.yup;
      expect(gauge.hashMap).toEqual({});
      incrementGauge('yup', { foo: 'bar' }, 2);
      expect(gauge.hashMap).toMatchInlineSnapshot(`
        {
          "foo:bar,": {
            "labels": {
              "foo": "bar",
            },
            "value": 2,
          },
        }
      `);
    });
  });

  describe('setGauge', () => {
    it('is a function', () => {
      const { setGauge } = load();
      expect(setGauge).toBeInstanceOf(Function);
    });

    it('throws an error if the gauge does not exist', () => {
      const { setGauge } = load();
      expect(() => setGauge('nope')).toThrowErrorMatchingInlineSnapshot(
        '"unable to find gauge nope, please create it first"'
      );
    });

    it('calls the set method of the gauge', () => {
      const { createGauge, setGauge } = load();
      createGauge({ name: 'yup', help: 'yup_help' });
      const gauge = register._metrics.yup;
      expect(gauge.hashMap[''].value).toBe(0);
      setGauge('yup', 101);
      expect(gauge.hashMap[''].value).toBe(101);
    });

    it('calls the set method of the gauge with the arguments', () => {
      const { createGauge, setGauge } = load();
      createGauge({ name: 'yup', help: 'yup_help', labelNames: ['foo'] });
      const gauge = register._metrics.yup;
      expect(gauge.hashMap).toEqual({});
      setGauge('yup', { foo: 'bar' }, 101);
      expect(gauge.hashMap).toMatchInlineSnapshot(`
        {
          "foo:bar,": {
            "labels": {
              "foo": "bar",
            },
            "value": 101,
          },
        }
      `);
    });
  });

  describe('resetGauge', () => {
    it('is a function', () => {
      const { resetGauge } = load();
      expect(resetGauge).toBeInstanceOf(Function);
    });

    it('throws an error if the gauge does not exist', () => {
      const { resetGauge } = load();
      expect(() => resetGauge('nope')).toThrowErrorMatchingInlineSnapshot(
        '"unable to find gauge nope, please create it first"'
      );
    });

    it('calls the reset method of the gauge', () => {
      const { createGauge, resetGauge, setGauge } = load();
      createGauge({ name: 'yup', help: 'yup_help' });
      const gauge = register._metrics.yup;
      setGauge('yup', 101);
      expect(gauge.hashMap[''].value).toBe(101);
      resetGauge('yup');
      expect(gauge.hashMap[''].value).toBe(0);
    });
  });
});
