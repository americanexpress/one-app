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

jest.mock('../../../../../src/server/utils/logging/development-formatters/verbose', () => 'verbose export');
jest.mock('../../../../../src/server/utils/logging/development-formatters/friendly', () => 'friendly export');

describe('index', () => {
  let index;

  beforeEach(() => {
    jest.resetModules();
  });

  function load(logFormat = '') {
    jest.doMock('yargs', () => ({
      argv: {
        logFormat,
      },
    }));
    index = require('../../../../../src/server/utils/logging/development-formatters');
  }

  it('returns the friendly formatter by default', () => {
    process.stdout.clearLine = jest.fn();
    load();
    expect(index).toBe('friendly export');
  });

  it('returns the verbose formatter when give CLI argument logging=verbose', () => {
    process.stdout.clearLine = jest.fn();
    load('verbose');
    expect(index).toBe('verbose export');
  });

  it('returns the verbose formatter when stdout does not support fancy CLIs', () => {
    // ex: being piped to a file, we don't need/want the spinners
    delete process.stdout.clearLine;
    load('verbose');
    expect(index).toBe('verbose export');
  });
});
