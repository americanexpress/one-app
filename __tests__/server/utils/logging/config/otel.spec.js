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

import pino from 'pino';
import ThreadStream from 'thread-stream';
import otelConfig, {
  createOtelTransport,
} from '../../../../../src/server/utils/logging/config/otel';
import { serializeError } from '../../../../../src/server/utils/logging/utils';

jest.mock('../../../../../src/server/utils/logging/utils', () => ({
  serializeError: jest.fn(),
  formatLogEntry: jest.fn((input) => ({ ...input, formatted: true })),
}));

jest.mock('../../../../../src/server/utils/readJsonFile', () => () => ({ buildVersion: 'X.X.X' }));

jest.mock('node:os', () => ({
  hostname: () => 'mockHostName',
}));

jest.spyOn(pino, 'transport');

jest.spyOn(console, 'error').mockImplementation(() => {});

describe('OpenTelemetry logging', () => {
  const { FORCE_COLOR, NO_COLOR } = process.env;
  const { isTTY } = process.stdout;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.FORCE_COLOR;
    delete process.env.NO_COLOR;
  });

  afterAll(() => {
    process.env.FORCE_COLOR = FORCE_COLOR;
    process.env.NO_COLOR = NO_COLOR;
    process.stdout.isTTY = isTTY;
  });

  describe('config', () => {
    it('should serialize errors', () => {
      expect(otelConfig.serializers.err).toBe(serializeError);
    });

    it('should set base data', () => {
      expect(otelConfig.base).toMatchInlineSnapshot(`
        {
          "schemaVersion": "1.0.0",
        }
      `);
    });

    it('should coerce "log" level to "info" level', () => {
      expect(otelConfig.formatters.level('log', 35)).toEqual({ level: 30 });
    });

    it('should not coerce other levels', () => {
      expect(otelConfig.formatters.level('trace', 10)).toEqual({ level: 10 });
      expect(otelConfig.formatters.level('debug', 20)).toEqual({ level: 20 });
      expect(otelConfig.formatters.level('info', 30)).toEqual({ level: 30 });
      expect(otelConfig.formatters.level('warn', 40)).toEqual({ level: 40 });
      expect(otelConfig.formatters.level('error', 50)).toEqual({ level: 50 });
    });

    it('should flatten log objects', () => {
      const logEntry = {
        foo: {
          bar: 'baz',
        },
        fizz: {
          buzz: {
            fizzbuzz: true,
          },
          hello: 'world',
        },
      };

      expect(otelConfig.formatters.log(logEntry)).toMatchInlineSnapshot(`
        {
          "fizz.buzz.fizzbuzz": true,
          "fizz.hello": "world",
          "foo.bar": "baz",
          "formatted": true,
        }
      `);
    });
  });

  describe('transport', () => {
    process.env.OTEL_SERVICE_NAME = 'Mock Service Name';
    process.env.OTEL_SERVICE_NAMESPACE = 'Mock Service Namespace';

    it('should include custom resource attributes', () => {
      process.env.OTEL_RESOURCE_ATTRIBUTES = 'service.custom.id=XXXXX,deployment.env=qa';
      const transport = createOtelTransport();
      expect(transport).toBeInstanceOf(ThreadStream);
      expect(pino.transport).toHaveBeenCalledTimes(1);
      expect(pino.transport.mock.calls[0][0].options.resourceAttributes).toMatchInlineSnapshot(`
        {
          "deployment.env": "qa",
          "service.custom.id": "XXXXX",
          "service.instance.id": "mockHostName",
          "service.name": "Mock Service Name",
          "service.namespace": "Mock Service Namespace",
          "service.version": "X.X.X",
        }
      `);
      expect(pino.transport.mock.results[0].value).toBe(transport);
    });

    it('should not throw if there are not custom resource attributes', () => {
      delete process.env.OTEL_RESOURCE_ATTRIBUTES;
      let transport;
      expect(() => {
        transport = createOtelTransport();
      }).not.toThrow();
      expect(transport).toBeInstanceOf(ThreadStream);
      expect(pino.transport).toHaveBeenCalledTimes(1);
      expect(pino.transport.mock.calls[0][0]).toMatchInlineSnapshot(`
        {
          "options": {
            "logRecordProcessorOptions": {
              "exporterOptions": {
                "protocol": "grpc",
              },
              "recordProcessorType": "batch",
            },
            "loggerName": "Mock Service Name",
            "messageKey": "message",
            "resourceAttributes": {
              "service.instance.id": "mockHostName",
              "service.name": "Mock Service Name",
              "service.namespace": "Mock Service Namespace",
              "service.version": "X.X.X",
            },
            "serviceVersion": "X.X.X",
          },
          "target": "pino-opentelemetry-transport",
        }
      `);
      expect(pino.transport.mock.results[0].value).toBe(transport);
    });
  });

  it('should include the grpc exporter and not the console exporter by default', () => {
    const transport = createOtelTransport();
    expect(transport).toBeInstanceOf(ThreadStream);
    expect(pino.transport).toHaveBeenCalledTimes(1);
    expect(pino.transport.mock.calls[0][0].options.logRecordProcessorOptions)
      .toMatchInlineSnapshot(`
      {
        "exporterOptions": {
          "protocol": "grpc",
        },
        "recordProcessorType": "batch",
      }
    `);
    expect(pino.transport.mock.results[0].value).toBe(transport);
  });

  it('should include the console exporter when console is true', () => {
    const transport = createOtelTransport({ console: true });
    expect(transport).toBeInstanceOf(ThreadStream);
    expect(pino.transport).toHaveBeenCalledTimes(1);
    expect(pino.transport.mock.calls[0][0].options.logRecordProcessorOptions)
      .toMatchInlineSnapshot(`
      [
        {
          "exporterOptions": {
            "protocol": "grpc",
          },
          "recordProcessorType": "batch",
        },
        {
          "exporterOptions": {
            "protocol": "console",
          },
          "recordProcessorType": "simple",
        },
      ]
    `);
    expect(pino.transport.mock.results[0].value).toBe(transport);
  });

  it('should include the console exporter and not the grpc exporter when console is true and grpc is false', () => {
    const transport = createOtelTransport({ grpc: false, console: true });
    expect(transport).toBeInstanceOf(ThreadStream);
    expect(pino.transport).toHaveBeenCalledTimes(1);
    expect(pino.transport.mock.calls[0][0].options.logRecordProcessorOptions)
      .toMatchInlineSnapshot(`
      {
        "exporterOptions": {
          "protocol": "console",
        },
        "recordProcessorType": "simple",
      }
    `);
    expect(pino.transport.mock.results[0].value).toBe(transport);
  });

  it('should force color when using the console exporter if stdout is a TTY and NO_COLOR is not set', () => {
    process.stdout.isTTY = true;
    expect(process.env.FORCE_COLOR).toBeUndefined();
    createOtelTransport({ grpc: false, console: true });
    expect(process.env.FORCE_COLOR).toBe('1');
  });

  it('should not force color when using the console exporter if stdout is not a TTY', () => {
    delete process.stdout.isTTY;
    expect(process.env.FORCE_COLOR).toBeUndefined();
    createOtelTransport({ grpc: false, console: true });
    expect(process.env.FORCE_COLOR).toBeUndefined();
  });

  it('should not force color when using the console exporter if NO_COLOR is set', () => {
    process.stdout.isTTY = true;
    process.env.NO_COLOR = 'true';
    expect(process.env.FORCE_COLOR).toBeUndefined();
    createOtelTransport({ grpc: false, console: true });
    expect(process.env.FORCE_COLOR).toBeUndefined();
  });

  it('should not batch logs in integration tests', () => {
    process.env.NODE_ENV = 'production';
    process.env.INTEGRATION_TEST = 'true';
    const transport = createOtelTransport();
    expect(pino.transport).toHaveBeenCalledTimes(1);
    expect(pino.transport.mock.calls[0][0].options.logRecordProcessorOptions)
      .toMatchInlineSnapshot(`
      {
        "exporterOptions": {
          "protocol": "grpc",
        },
        "recordProcessorType": "simple",
      }
    `);
    expect(pino.transport.mock.results[0].value).toBe(transport);
    delete process.env.INTEGRATION_TEST;
  });

  it('should log an error and return undefined when attempting to create a transport with no exporter', () => {
    const transport = createOtelTransport({ grpc: false });
    expect(transport).toBe(undefined);
    expect(pino.transport).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error.mock.calls[0][0]).toMatchInlineSnapshot(
      '"OTEL DISABLED: attempted to create OpenTelemetry transport without including a processor"'
    );
  });
});
