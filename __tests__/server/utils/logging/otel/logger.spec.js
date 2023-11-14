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

import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
// import { registerInstrumentations } from '@opentelemetry/instrumentation';
// import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
// import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import {
  ConsoleLogRecordExporter,
  SimpleLogRecordProcessor,
  BatchLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import {
  createOtelLogger,
  replaceGlobalConsoleWithOtelLogger,
  shutdownOtelLogger,
} from '../../../../../src/server/utils/logging/otel/logger';

jest.mock('@opentelemetry/api-logs', () => {
  const logger = { emit: jest.fn() };
  return {
    logs: {
      setGlobalLoggerProvider: jest.fn(),
      getLogger: () => logger,
    },
    SeverityNumber: jest.requireActual('@opentelemetry/api-logs').SeverityNumber,
  };
});

jest.mock('@opentelemetry/sdk-logs');
jest.mock('@opentelemetry/exporter-logs-otlp-grpc');
jest.mock('@opentelemetry/instrumentation');
jest.mock('@opentelemetry/instrumentation-http');
jest.mock('@opentelemetry/instrumentation-express');

jest.mock('../../../../../src/server/utils/readJsonFile', () => () => ({
  buildVersion: '1.2.3-abc123',
}));
jest.mock('node:os', () => ({
  hostname: () => 'host-123',
  type: () => 'Darwin',
  arch: () => 'x64',
}));

const loadEnvVars = () => {
  process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = 'http://localhost:4318/v1/logs';
  process.env.OTEL_SERVICE_NAME = 'One App';
  process.env.OTEL_SERVICE_NAMESPACE = 'Namespace';
  process.env.OTEL_RESOURCE_ATTRIBUTES = 'foo=bar;baz=qux';
};

const originalNodeEnv = process.env.NODE_ENV;

const unloadEnvVars = () => {
  delete process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
  delete process.env.OTEL_SERVICE_NAME;
  delete process.env.OTEL_SERVICE_NAMESPACE;
  delete process.env.OTEL_RESOURCE_ATTRIBUTES;
  process.env.NODE_ENV = originalNodeEnv;
};

const originalConsole = console;

const restoreConsole = () => {
  ['error', 'warn', 'log', 'info', 'debug'].forEach((method) => {
    console[method] = originalConsole[method];
  });
};

describe('OpenTelemetry logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadEnvVars();
  });
  afterAll(unloadEnvVars);

  describe('shutdownOtelLogger', () => {
    it('shuts down the batch processor', async () => {
      const batchProcessor = { shutdown: jest.fn() };
      BatchLogRecordProcessor.mockReturnValueOnce(batchProcessor);
      createOtelLogger();
      await shutdownOtelLogger();
      expect(batchProcessor.shutdown).toHaveBeenCalledTimes(1);
    });

    it('does not attempt to shut down the batch processor if not using OTel', async () => {
      jest.resetModules();
      const { shutdownOtelLogger: shutdownOtelLogger2 } = require('../../../../../src/server/utils/logging/otel/logger');
      delete process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
      const batchProcessor = { shutdown: jest.fn() };
      BatchLogRecordProcessor.mockReturnValueOnce(batchProcessor);
      await shutdownOtelLogger2();
      expect(batchProcessor.shutdown).not.toHaveBeenCalled();
      loadEnvVars();
    });
  });

  describe('createOtelLogger', () => {
    it('should create an exporter with the expected collector options', () => {
      createOtelLogger();
      expect(OTLPLogExporter.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "concurrencyLimit": 10,
          "headers": Object {},
          "resource": Resource {
            "_asyncAttributesPromise": undefined,
            "_attributes": Object {
              "baz": "qux",
              "foo": "bar",
              "service.instance.id": "host-123",
              "service.name": "One App",
              "service.namespace": "Namespace",
              "service.version": "1.2.3-abc123",
            },
            "_syncAttributes": Object {
              "baz": "qux",
              "foo": "bar",
              "service.instance.id": "host-123",
              "service.name": "One App",
              "service.namespace": "Namespace",
              "service.version": "1.2.3-abc123",
            },
            "asyncAttributesPending": false,
          },
        }
      `);
    });

    it('should not throw if no custom resource attributes are set', () => {
      delete process.env.OTEL_RESOURCE_ATTRIBUTES;
      expect(() => createOtelLogger()).not.toThrow();
      loadEnvVars();
    });

    it('should export to STDOUT and OTLP in development', () => {
      process.env.NODE_ENV = 'development';
      createOtelLogger();
      expect(SimpleLogRecordProcessor).toHaveBeenCalledTimes(1);
      expect(BatchLogRecordProcessor).toHaveBeenCalledTimes(1);
      expect(SimpleLogRecordProcessor).toHaveBeenCalledWith(expect.any(ConsoleLogRecordExporter));
      expect(BatchLogRecordProcessor).toHaveBeenCalledWith(expect.any(OTLPLogExporter));
    });

    it('should not export to STDOUT in production', () => {
      process.env.NODE_ENV = 'production';
      createOtelLogger();
      expect(BatchLogRecordProcessor).toHaveBeenCalledTimes(1);
      expect(SimpleLogRecordProcessor).not.toHaveBeenCalled();
      expect(BatchLogRecordProcessor).toHaveBeenCalledWith(expect.any(OTLPLogExporter));
    });

    // it('should register HTTP & Express instrumentation', () => {
    //   createOtelLogger();
    //   expect(registerInstrumentations).toHaveBeenCalledWith({
    //     instrumentations: [expect.any(HttpInstrumentation), expect.any(ExpressInstrumentation)],
    //   });
    // });
  });

  describe('replaceGlobalConsoleWithOtelLogger', () => {
    beforeAll(() => {
      replaceGlobalConsoleWithOtelLogger(createOtelLogger());
    });
    afterAll(restoreConsole);

    const logger = logs.getLogger();

    it('should replace console.error', () => {
      console.error(new Error('error test'));
      expect(logger.emit).toHaveBeenCalledTimes(1);
      expect(logger.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'error test',
          severityText: 'ERROR',
          severityNumber: SeverityNumber.ERROR,
        })
      );
    });

    it('should replace console.warn', () => {
      console.warn('warn test');
      expect(logger.emit).toHaveBeenCalledTimes(1);
      expect(logger.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'warn test',
          severityText: 'WARN',
          severityNumber: SeverityNumber.WARN,
        })
      );
    });

    it('should replace console.log', () => {
      console.log('log test');
      expect(logger.emit).toHaveBeenCalledTimes(1);
      expect(logger.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'log test',
          severityText: 'INFO',
          severityNumber: SeverityNumber.INFO,
        })
      );
    });

    it('should replace console.info', () => {
      console.info('info test');
      expect(logger.emit).toHaveBeenCalledTimes(1);
      expect(logger.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'info test',
          severityText: 'INFO',
          severityNumber: SeverityNumber.INFO,
        })
      );
    });

    it('should replace console.debug', () => {
      console.debug('debug test');
      expect(logger.emit).toHaveBeenCalledTimes(1);
      expect(logger.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'debug test',
          severityText: 'DEBUG',
          severityNumber: SeverityNumber.DEBUG,
        })
      );
    });
  });
});
