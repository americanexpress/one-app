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

import { EventEmitter } from 'events';
import deepmerge from 'deepmerge';
import pino from 'pino';
import { argv } from 'yargs';
import exportedLogger, { createLogger } from '../../../../src/server/utils/logging/logger';
import baseConfig from '../../../../src/server/utils/logging/config/base';
import productionConfig from '../../../../src/server/utils/logging/config/production';
import developmentStream from '../../../../src/server/utils/logging/config/development';
import otelConfig, { createOtelTransport } from '../../../../src/server/utils/logging/config/otel';

jest.spyOn(pino, 'pino');
jest.spyOn(pino, 'multistream');

jest.mock('yargs', () => ({
  argv: {
    logLevel: 'debug',
  },
}));

jest.mock('../../../../src/server/utils/logging/config/otel', () => {
  const original = jest.requireActual('../../../../src/server/utils/logging/config/otel');
  const otelTransport = original.createOtelTransport();
  return {
    default: original.otelConfig,
    createOtelTransport: () => otelTransport,
  };
});

describe('logger', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    delete process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
    process.env.NODE_ENV = 'production';
    argv.logLevel = 'debug';
    delete argv.logFormat;
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('exports a pino logger', () => {
    expect(exportedLogger).toBeInstanceOf(EventEmitter);
    expect(Object.getPrototypeOf(exportedLogger).constructor.name).toBe('Pino');
  });

  it('uses the production formatter by default', () => {
    delete process.env.NODE_ENV;
    const logger = createLogger();
    expect(pino.pino).toHaveBeenCalledTimes(1);
    expect(pino.pino.mock.results[0].value).toBe(logger);
    expect(pino.pino).toHaveBeenCalledWith(deepmerge(baseConfig, productionConfig), undefined);
  });

  it('uses a development formatter when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';
    const logger = createLogger();
    expect(pino.pino).toHaveBeenCalledTimes(1);
    expect(pino.pino.mock.results[0].value).toBe(logger);
    expect(pino.pino).toHaveBeenCalledWith(baseConfig, developmentStream);
  });

  it('uses the production formatter when the log-format flag is set to machine', () => {
    argv.logLevel = 'info';
    argv.logFormat = 'machine';
    const logger = createLogger();
    expect(pino.pino).toHaveBeenCalledTimes(1);
    expect(pino.pino.mock.results[0].value).toBe(logger);
    expect(pino.pino).toHaveBeenCalledWith(deepmerge(baseConfig, productionConfig), undefined);
  });

  it('uses the OpenTelemetry config when OTEL_EXPORTER_OTLP_LOGS_ENDPOINT is set', () => {
    process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = 'http://0.0.0.0:4317/v1/logs';
    const logger = createLogger();
    expect(pino.pino).toHaveBeenCalledTimes(1);
    expect(pino.pino.mock.results[0].value).toBe(logger);
    expect(pino.pino).toHaveBeenCalledWith(
      deepmerge(baseConfig, otelConfig),
      createOtelTransport()
    );
    expect(pino.multistream).not.toHaveBeenCalled();
  });

  it('uses both OpenTlemetry config and development config when OTEL_EXPORTER_OTLP_LOGS_ENDPOINT is set in development', () => {
    process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = 'http://0.0.0.0:4317/v1/logs';
    process.env.NODE_ENV = 'development';
    const logger = createLogger();
    expect(pino.pino).toHaveBeenCalledTimes(1);
    expect(pino.pino.mock.results[0].value).toBe(logger);
    expect(pino.multistream).toHaveBeenCalledTimes(1);
    expect(pino.multistream).toHaveBeenCalledWith([
      { stream: developmentStream },
      createOtelTransport(),
    ]);
    expect(pino.pino).toHaveBeenCalledWith(
      deepmerge(baseConfig, otelConfig),
      pino.multistream.mock.results[0].value
    );
  });
});
