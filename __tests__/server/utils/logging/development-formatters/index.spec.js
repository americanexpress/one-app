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

import yargs from 'yargs';

jest.mock('yargs', () => ({ argv: {} }));

describe('index', () => {
  let index;
  let verbose;
  let friendly;

  function load(logFormat = '') {
    jest.resetModules();
    yargs.argv = { logFormat };
    jest.mock('../../../../../src/server/utils/logging/development-formatters/verbose', () => ({
      formatter: jest.fn(),
      beforeWrite: jest.fn(),
      afterWrite: jest.fn(),
    }));
    jest.mock('../../../../../src/server/utils/logging/development-formatters/friendly', () => ({
      formatter: jest.fn(),
      beforeWrite: jest.fn(),
      afterWrite: jest.fn(),
    }));

    verbose = require('../../../../../src/server/utils/logging/development-formatters/verbose').default;
    friendly = require('../../../../../src/server/utils/logging/development-formatters/friendly').default;
    index = require('../../../../../src/server/utils/logging/development-formatters').default;
  }

  it('returns the friendly formatter by default', () => {
    process.stdout.clearLine = jest.fn();
    load();
    expect(index).toBe(friendly);
  });

  it('returns the verbose formatter when give CLI argument logging=verbose', () => {
    process.stdout.clearLine = jest.fn();
    load('verbose');
    expect(index).toBe(verbose);
  });

  it('returns the verbose formatter when stdout does not support fancy CLIs', () => {
    // ex: being piped to a file, we don't need/want the spinners
    delete process.stdout.clearLine;
    load('verbose');
    expect(index).toBe(verbose);
  });
});
