/**
 * @jest-environment node
 */

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
    logFormat: 'machine',
  },
}));

let NODE_ENV = 'production';
jest.replaceProperty(process, 'env', {
  ...process.env,
  get NODE_ENV() {
    return NODE_ENV;
  },
  set NODE_ENV(nodeEnv) {
    NODE_ENV = nodeEnv;
    // Use defaults based on NODE_ENV from src/server/config/env/argv.js
    argv.logFormat = nodeEnv === 'development' ? 'friendly' : 'machine';
    argv.logLevel = nodeEnv === 'development' ? 'log' : 'info';
  },
});

jest.mock('../../../../src/server/utils/logging/config/otel', () => {
  const objectHash = require('object-hash');
  const original = jest.requireActual('../../../../src/server/utils/logging/config/otel');
  const transports = {};
  return {
    default: original.otelConfig,
    createOtelTransport: jest.fn((opts) => {
      const key = objectHash(opts);
      transports[key] = transports[key] || original.createOtelTransport(opts);
      return transports[key];
    }),
  };
});

describe('logger', () => {
  beforeEach(() => {
    delete process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
    process.env.NODE_ENV = 'production';
    jest.clearAllMocks();
  });

  it('exports a pino logger', () => {
    expect(exportedLogger).toBeInstanceOf(EventEmitter);
    expect(Object.getPrototypeOf(exportedLogger).constructor.name).toBe('Pino');
  });

  it('uses the production formatter by default', () => {
    process.env.NODE_ENV = undefined;
    const logger = createLogger();
    expect(logger).toBeInstanceOf(EventEmitter);
    expect(pino.pino).toHaveBeenCalledTimes(1);
    expect(pino.pino.mock.results[0].value).toBe(logger);
    expect(pino.pino).toHaveBeenCalledWith(deepmerge(baseConfig, productionConfig), undefined);
  });

  it('uses a development formatter when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';
    const logger = createLogger();
    expect(logger).toBeInstanceOf(EventEmitter);
    expect(pino.pino).toHaveBeenCalledTimes(1);
    expect(pino.pino.mock.results[0].value).toBe(logger);
    expect(pino.pino).toHaveBeenCalledWith(baseConfig, developmentStream);
  });

  it('uses the production formatter when the log-format flag is set to machine', () => {
    process.env.NODE_ENV = 'development';
    argv.logFormat = 'machine';
    const logger = createLogger();
    expect(logger).toBeInstanceOf(EventEmitter);
    expect(pino.pino).toHaveBeenCalledTimes(1);
    expect(pino.pino.mock.results[0].value).toBe(logger);
    expect(pino.pino).toHaveBeenCalledWith(deepmerge(baseConfig, productionConfig), undefined);
  });

  it('uses the OpenTelemetry config when OTEL_EXPORTER_OTLP_LOGS_ENDPOINT is set', () => {
    process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = 'http://0.0.0.0:4317/v1/logs';
    const logger = createLogger();
    expect(logger).toBeInstanceOf(EventEmitter);
    expect(createOtelTransport).toHaveBeenCalledTimes(1);
    expect(createOtelTransport).toHaveBeenCalledWith({ grpc: true, console: false });
    expect(pino.pino).toHaveBeenCalledTimes(1);
    expect(pino.pino.mock.results[0].value).toBe(logger);
    expect(pino.pino).toHaveBeenCalledWith(
      deepmerge(baseConfig, otelConfig),
      createOtelTransport({ grpc: true, console: false })
    );
  });

  it('uses a development formatter and OpenTelemetry config when OTEL_EXPORTER_OTLP_LOGS_ENDPOINT is set & NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';
    process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = 'http://0.0.0.0:4317/v1/logs';
    const logger = createLogger();
    expect(logger).toBeInstanceOf(EventEmitter);
    expect(createOtelTransport).toHaveBeenCalledTimes(1);
    expect(createOtelTransport).toHaveBeenCalledWith({ grpc: true, console: false });
    expect(pino.pino).toHaveBeenCalledTimes(1);
    expect(pino.pino.mock.results[0].value).toBe(logger);
    expect(pino.multistream).toHaveBeenCalledTimes(1);
    expect(pino.multistream).toHaveBeenCalledWith([
      createOtelTransport({ grpc: true, console: false }),
      developmentStream,
    ]);
    expect(pino.pino).toHaveBeenCalledWith(
      deepmerge(baseConfig, otelConfig),
      pino.multistream.mock.results[0].value
    );
  });

  it('uses a the OpenTelemetry console exporter when OTEL_EXPORTER_OTLP_LOGS_ENDPOINT is set, NODE_ENV is development & log-format is machine', () => {
    process.env.NODE_ENV = 'development';
    process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = 'http://0.0.0.0:4317/v1/logs';
    argv.logFormat = 'machine';
    const logger = createLogger();
    expect(logger).toBeInstanceOf(EventEmitter);
    expect(createOtelTransport).toHaveBeenCalledTimes(1);
    expect(createOtelTransport).toHaveBeenCalledWith({ grpc: true, console: true });
    expect(pino.pino).toHaveBeenCalledTimes(1);
    expect(pino.pino.mock.results[0].value).toBe(logger);
    expect(pino.multistream).not.toHaveBeenCalled();
    expect(pino.pino).toHaveBeenCalledWith(
      deepmerge(baseConfig, otelConfig),
      createOtelTransport({ grpc: true, console: true })
    );
  });
});
