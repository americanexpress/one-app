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

describe('logger', () => {
  let logger;
  let Lumberjack;
  let productionFormatter;
  let developmentFormatter;

  function load(nodeEnv) {
    jest.resetModules();

    if (typeof nodeEnv === 'string') {
      process.env.NODE_ENV = nodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    jest.mock('@americanexpress/lumberjack', () => jest.fn());
    jest.mock('../../../../src/server/utils/logging/production-formatter', () => jest.fn(() => 'prod'));
    jest.mock('../../../../src/server/utils/logging/development-formatters', () => ({
      formatter: jest.fn(() => 'dev'),
      beforeWrite: jest.fn(),
      afterWrite: jest.fn(),
    }));

    Lumberjack = require('@americanexpress/lumberjack');
    productionFormatter = require('../../../../src/server/utils/logging/production-formatter');
    developmentFormatter = require('../../../../src/server/utils/logging/development-formatters');

    logger = require('../../../../src/server/utils/logging/logger').default;
  }

  it('is an instance of @americanexpress/lumberjack', () => {
    load();
    expect(logger).toBeInstanceOf(Lumberjack);
    expect(logger).toBe(Lumberjack.mock.instances[0]);
  });

  it('uses the production formatter by default', () => {
    load();
    expect(Lumberjack.mock.calls[0][0]).toHaveProperty('formatter', productionFormatter);
  });

  it('uses a development formatter when NODE_ENV is development', () => {
    load('development');
    expect(Lumberjack.mock.calls[0][0]).toBe(developmentFormatter);
  });

  it('uses the production formatter when the log-format flag is set to machine', () => {
    jest.mock('yargs', () => ({ argv: { logFormat: 'machine' } }));
    load();
    expect(Lumberjack.mock.calls[0][0]).toHaveProperty('formatter', productionFormatter);
  });
});
