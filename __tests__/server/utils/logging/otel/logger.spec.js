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
import {
  ConsoleLogRecordExporter,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import {
  createOtelLogger,
  replaceGlobalConsoleWithOtelLogger,
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

jest.mock('../../../../../src/server/utils/readJsonFile', () => () => ({
  buildVersion: '1.2.3-abc123',
}));
jest.mock('os', () => ({
  hostname: () => 'host-123',
  type: () => 'Darwin',
  arch: () => 'x64',
}));
Object.defineProperty(process, 'pid', {
  writable: true,
  value: 1234,
});

const loadEnvVars = () => {
  process.env.OTEL_LOG_COLLECTOR_URL = 'http://localhost:4318/v1/logs';
  process.env.OTEL_SERVICE_NAME = 'One App';
  process.env.OTEL_SERVICE_NAMESPACE = 'Namespace';
  process.env.OTEL_RESOURCE_ATTRIBUTES = 'foo=bar;baz=qux';
};

const originalNodeEnv = process.env.NODE_ENV;

const unloadEnvVars = () => {
  delete process.env.OTEL_LOG_COLLECTOR_URL;
  delete process.env.OTEL_SERVICE_NAME;
  delete process.env.OTEL_SERVICE_NAMESPACE;
  delete process.env.OTEL_RESOURCE_ATTRIBUTES;
  delete process.env.ONE_OTLP_ONLY_NO_STDOUT;
  process.env.NODE_ENV = originalNodeEnv;
};

const originalConsole = console;

const restoreConsole = () => {
  ['error', 'warn', 'log', 'info', 'debug'].forEach((method) => {
    console[method] = originalConsole[method];
  });
};

describe('OpenTelemetry logger', () => {
  beforeAll(loadEnvVars);
  beforeEach(jest.resetAllMocks);
  afterAll(unloadEnvVars);

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
              "service.instance.id": "host-123:1234",
              "service.name": "One App",
              "service.namespace": "Namespace",
              "service.version": "1.2.3-abc123",
            },
            "_syncAttributes": Object {
              "baz": "qux",
              "foo": "bar",
              "service.instance.id": "host-123:1234",
              "service.name": "One App",
              "service.namespace": "Namespace",
              "service.version": "1.2.3-abc123",
            },
            "asyncAttributesPending": false,
          },
          "url": "http://localhost:4318/v1/logs",
        }
      `);
    });

    it('should export to STDOUT and OTLP in development', () => {
      process.env.NODE_ENV = 'development';
      createOtelLogger();
      expect(SimpleLogRecordProcessor).toHaveBeenCalledTimes(2);
      expect(SimpleLogRecordProcessor).toHaveBeenCalledWith(expect.any(ConsoleLogRecordExporter));
      expect(SimpleLogRecordProcessor).toHaveBeenCalledWith(expect.any(OTLPLogExporter));
    });

    it('should not export to STDOUT in production', () => {
      process.env.NODE_ENV = 'production';
      createOtelLogger();
      expect(SimpleLogRecordProcessor).toHaveBeenCalledTimes(1);
      expect(SimpleLogRecordProcessor).not.toHaveBeenCalledWith(
        expect.any(ConsoleLogRecordExporter)
      );
      expect(SimpleLogRecordProcessor).toHaveBeenCalledWith(expect.any(OTLPLogExporter));
    });
  });

  describe('replaceGlobalConsoleWithOtelLogger', () => {
    beforeAll(replaceGlobalConsoleWithOtelLogger);
    afterAll(restoreConsole);

    const logger = logs.getLogger();

    it('should replace console.error', () => {
      console.error(new Error('error test'));
      expect(logger.emit).toHaveBeenCalledTimes(1);
      expect(logger.emit).toHaveBeenCalledWith(expect.objectContaining({
        body: 'error test',
        severityText: 'ERROR',
        severityNumber: SeverityNumber.ERROR,
      }));
    });

    it('should replace console.warn', () => {
      console.warn('warn test');
      expect(logger.emit).toHaveBeenCalledTimes(1);
      expect(logger.emit).toHaveBeenCalledWith(expect.objectContaining({
        body: 'warn test',
        severityText: 'WARN',
        severityNumber: SeverityNumber.WARN,
      }));
    });

    it('should replace console.log', () => {
      console.log('log test');
      expect(logger.emit).toHaveBeenCalledTimes(1);
      expect(logger.emit).toHaveBeenCalledWith(expect.objectContaining({
        body: 'log test',
        severityText: 'UNSPECIFIED',
        severityNumber: SeverityNumber.UNSPECIFIED,
      }));
    });

    it('should replace console.info', () => {
      console.info('info test');
      expect(logger.emit).toHaveBeenCalledTimes(1);
      expect(logger.emit).toHaveBeenCalledWith(expect.objectContaining({
        body: 'info test',
        severityText: 'INFO',
        severityNumber: SeverityNumber.INFO,
      }));
    });

    it('should replace console.debug', () => {
      console.debug('debug test');
      expect(logger.emit).toHaveBeenCalledTimes(1);
      expect(logger.emit).toHaveBeenCalledWith(expect.objectContaining({
        body: 'debug test',
        severityText: 'DEBUG',
        severityNumber: SeverityNumber.DEBUG,
      }));
    });
  });
});
