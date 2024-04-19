/*
 * Copyright 2024 American Express Travel Related Services Company, Inc.
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

const { default: logger } = require('../../../../src/server/utils/logging/logger');

jest.mock('yargs', () => ({
  argv: {
    logLevel: 'trace',
  },
}));

describe('monkeyPatchConsole', () => {
  jest.spyOn(logger, 'log').mockImplementation(() => {});

  const logMethods = ['error', 'warn', 'log', 'info', 'debug', 'trace'];
  const originalConsole = logMethods.reduce((acc, curr) => ({
    ...acc,
    [curr]: console[curr],
  }), {});

  afterEach(() => {
    logMethods.forEach((method) => { console[method] = originalConsole[method]; });
  });

  function load() {
    jest.resetModules();
    require('../../../../src/server/utils/logging/monkeyPatchConsole');
  }

  it('replaces the global console with logger', () => {
    load();
    logMethods.forEach((method) => {
      expect(console[method].name).toBe('bound hookWrappedLog');
      expect(console[method]).not.toBe(originalConsole[method]);
    });
  });

  it('allows to use logger methods and not console', () => {
    logger.log('testing');

    expect(logger.log).toHaveBeenCalledTimes(1);
  });
});
