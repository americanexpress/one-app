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

describe('counters', () => {
  let Counter;
  let register;

  function load() {
    jest.resetModules();
    ({ Counter, register } = require('prom-client'));
    return require('../../../src/server/metrics/counters');
  }

  describe('createCounter', () => {
    it('is a function', () => {
      const { createCounter } = load();
      expect(createCounter).toBeInstanceOf(Function);
    });

    it('creates a counter with the options', () => {
      const { createCounter } = load();
      expect(register._metrics).toEqual({});
      createCounter({ name: 'yup', help: 'yup_help' });
      const counter = register._metrics.yup;
      expect(counter).toBeInstanceOf(Counter);
    });

    it('does not create a new counter if one with the same name already exists', () => {
      const { createCounter } = load();
      expect(register._metrics).toEqual({});
      createCounter({ name: 'yup', help: 'yup_help' });
      const counter = register._metrics.yup;
      createCounter({ name: 'yup', help: 'yup_help' });
      expect(register._metrics.yup).toBe(counter);
    });
  });

  describe('incrementCounter', () => {
    it('is a function', () => {
      const { incrementCounter } = load();
      expect(incrementCounter).toBeInstanceOf(Function);
    });

    it('throws an error if the counter does not exist', () => {
      const { incrementCounter } = load();
      expect(() => incrementCounter('nope')).toThrowErrorMatchingInlineSnapshot(
        '"unable to find counter nope, please create it first"'
      );
    });

    it('calls the inc method of the counter', () => {
      const { createCounter, incrementCounter } = load();
      createCounter({ name: 'yup', help: 'yup_help' });
      const counter = register._metrics.yup;
      expect(counter.hashMap[''].value).toBe(0);
      incrementCounter('yup');
      expect(counter.hashMap[''].value).toBe(1);
      incrementCounter('yup', 2);
      expect(counter.hashMap[''].value).toBe(3);
    });

    it('calls the inc method of the counter with the arguments', () => {
      const { createCounter, incrementCounter } = load();
      createCounter({ name: 'yup', help: 'yup_help', labelNames: ['foo'] });
      const counter = register._metrics.yup;
      expect(counter.hashMap).toEqual({});
      incrementCounter('yup', { foo: 'bar' }, 2);
      expect(counter.hashMap).toMatchInlineSnapshot(`
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
});
