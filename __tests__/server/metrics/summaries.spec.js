/*
 * Copyright 2023 American Express Travel Related Services Company, Inc.
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

describe('summaries', () => {
  let Summary;
  let register;

  function load() {
    jest.resetModules();
    ({ Summary, register } = require('prom-client'));
    return require('../../../src/server/metrics/summaries');
  }

  describe('createSummary', () => {
    it('is a function', () => {
      const { createSummary } = load();
      expect(createSummary).toBeInstanceOf(Function);
    });

    it('creates a summary with the options', () => {
      const { createSummary } = load();
      expect(register._metrics).toEqual({});
      createSummary({ name: 'yup', help: 'yup_help' });
      const summary = register._metrics.yup;
      expect(summary).toBeInstanceOf(Summary);
    });

    it('does not create a new summary if one with the same name already exists', () => {
      const { createSummary } = load();
      expect(register._metrics).toEqual({});
      createSummary({ name: 'yup', help: 'yup_help' });
      const summary = register._metrics.yup;
      createSummary({ name: 'yup', help: 'yup_help' });
      expect(register._metrics.yup).toBe(summary);
    });
  });

  describe('startSummaryTimer', () => {
    it('is a function', () => {
      const { startSummaryTimer } = load();
      expect(startSummaryTimer).toBeInstanceOf(Function);
    });

    it('throws an error if the summary does not exist', () => {
      const { startSummaryTimer } = load();
      expect(() => startSummaryTimer('nope')).toThrowErrorMatchingInlineSnapshot(
        '"unable to find summary nope, please create it first"'
      );
    });

    it('calls the startTimer method of the summary', () => {
      const { createSummary, startSummaryTimer } = load();
      createSummary({ name: 'yup', help: 'yup_help' });
      const summary = register._metrics.yup;
      expect(summary.hashMap[''].count).toBe(0);
      expect(summary.hashMap[''].sum).toBe(0);
      const endTimer = startSummaryTimer('yup');
      endTimer();
      expect(summary.hashMap[''].count).toBe(1);
      expect(summary.hashMap[''].sum).toBeGreaterThan(0);
    });

    it('calls the startTimer method of the summary with the arguments', () => {
      const { createSummary, startSummaryTimer } = load();
      createSummary({ name: 'yup', help: 'yup_help', labelNames: ['foo'] });
      const summary = register._metrics.yup;
      expect(summary.hashMap).toEqual({});
      const endTimer = startSummaryTimer('yup', { foo: 'bar' });
      endTimer();
      expect(summary.hashMap['foo:bar,'].count).toBe(1);
      expect(summary.hashMap['foo:bar,'].sum).toBeGreaterThan(0);
    });
  });
});
