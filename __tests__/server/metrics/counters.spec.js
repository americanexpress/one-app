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

describe('counters', () => {
  let Counter;

  function load() {
    jest.resetModules();

    jest.mock('prom-client');
    ({ Counter } = require('prom-client'));

    return require('../../../src/server/metrics/counters');
  }

  describe('createCounter', () => {
    it('is a function', () => {
      const { createCounter } = load();
      expect(createCounter).toBeInstanceOf(Function);
    });

    it('creates a counter with the options', () => {
      const { createCounter } = load();
      createCounter({ name: 'yup' });
      expect(Counter).toHaveBeenCalledTimes(1);
      const counter = Counter.mock.instances[0];
      expect(counter).toBeInstanceOf(Counter);
    });

    it('does not create a new counter if one with the same name already exists', () => {
      const { createCounter } = load();
      createCounter({ name: 'yup' });
      expect(Counter).toHaveBeenCalledTimes(1);
      createCounter({ name: 'yup' });
      expect(Counter).toHaveBeenCalledTimes(1);
    });
  });

  describe('incrementCounter', () => {
    it('is a function', () => {
      const { incrementCounter } = load();
      expect(incrementCounter).toBeInstanceOf(Function);
    });

    it('throws an error if the counter does not exist', () => {
      const { incrementCounter } = load();
      expect(() => incrementCounter('nope')).toThrowErrorMatchingSnapshot();
    });

    it('calls the inc method of the counter', () => {
      const { createCounter, incrementCounter } = load();
      createCounter({ name: 'yup' });
      const counter = Counter.mock.instances[0];
      incrementCounter('yup');
      expect(counter.inc).toHaveBeenCalledTimes(1);
    });

    it('calls the inc method of the counter with the arguments', () => {
      const { createCounter, incrementCounter } = load();
      createCounter({ name: 'yup' });
      const counter = Counter.mock.instances[0];
      incrementCounter('yup', 1, 'two', [null, null, null]);
      expect(counter.inc).toHaveBeenCalledTimes(1);
      expect(counter.inc).toHaveBeenCalledWith(1, 'two', [null, null, null]);
    });
  });
});
