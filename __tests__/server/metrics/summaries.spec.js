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

describe('summaries', () => {
  let Summary;

  function load() {
    jest.resetModules();

    jest.mock('prom-client');
    ({ Summary } = require('prom-client'));

    return require('../../../src/server/metrics/summaries');
  }

  describe('createSummary', () => {
    it('is a function', () => {
      const { createSummary } = load();
      expect(createSummary).toBeInstanceOf(Function);
    });

    it('creates a summary with the options', () => {
      const { createSummary } = load();
      createSummary({ name: 'yup' });
      expect(Summary).toHaveBeenCalledTimes(1);
      const summary = Summary.mock.instances[0];
      expect(summary).toBeInstanceOf(Summary);
    });

    it('does not create a new summary if one with the same name already exists', () => {
      const { createSummary } = load();
      createSummary({ name: 'yup' });
      expect(Summary).toHaveBeenCalledTimes(1);
      createSummary({ name: 'yup' });
      expect(Summary).toHaveBeenCalledTimes(1);
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
      createSummary({ name: 'yup' });
      const summary = Summary.mock.instances[0];
      startSummaryTimer('yup');
      expect(summary.startTimer).toHaveBeenCalledTimes(1);
    });

    it('calls the startTimer method of the summary with the arguments', () => {
      const { createSummary, startSummaryTimer } = load();
      createSummary({ name: 'yup' });
      const summary = Summary.mock.instances[0];
      startSummaryTimer('yup', 1, 'two', [null, null, null]);
      expect(summary.startTimer).toHaveBeenCalledTimes(1);
      expect(summary.startTimer).toHaveBeenCalledWith(1, 'two', [null, null, null]);
    });
  });
});
