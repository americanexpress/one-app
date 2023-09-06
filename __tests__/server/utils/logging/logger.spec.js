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
import deepmerge from 'deepmerge';

jest.mock('yargs', () => ({
  argv: {
    logLevel: 'debug',
  },
}));

describe('logger', () => {
  let logger;
  let pino;
  let productionConfig;
  let baseConfig;
  let developmentStream;

  function load(nodeEnv) {
    jest.resetModules();

    if (typeof nodeEnv === 'string') {
      process.env.NODE_ENV = nodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    jest.mock('pino', () => jest.fn(() => 'pino'));
    pino = require('pino');
    baseConfig = require('../../../../src/server/utils/logging/config/base').default;
    productionConfig = require('../../../../src/server/utils/logging/config/production').default;
    developmentStream = require('../../../../src/server/utils/logging/config/development').default;
    logger = require('../../../../src/server/utils/logging/logger').default;
  }

  it('is pino logger', () => {
    load();
    expect(logger).toBe('pino');
  });

  it('uses the production formatter by default', () => {
    load();
    expect(pino).toHaveBeenCalledTimes(1);
    expect(pino).toHaveBeenCalledWith(deepmerge(baseConfig, productionConfig), undefined);
  });

  it('uses a development formatter when NODE_ENV is development', () => {
    load('development');
    expect(pino).toHaveBeenCalledTimes(1);
    expect(pino).toHaveBeenCalledWith(baseConfig, developmentStream);
  });

  it('uses the production formatter when the log-format flag is set to machine', () => {
    jest.mock('yargs', () => ({ argv: { logFormat: 'machine', logLevel: 'info' } }));
    load();
    expect(pino).toHaveBeenCalledTimes(1);
    expect(pino).toHaveBeenCalledWith(deepmerge(baseConfig, productionConfig), undefined);
  });
});
