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

import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
// eslint-disable-next-line no-unused-vars -- required for mocking
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
  BatchSpanProcessor,
  SimpleSpanProcessor,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  ConsoleSpanExporter,
  NoopSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

jest.mock('@opentelemetry/instrumentation');
jest.mock('@opentelemetry/instrumentation-http');
jest.mock('@opentelemetry/instrumentation-pino');
jest.mock('@opentelemetry/sdk-trace-base');
jest.mock('@opentelemetry/exporter-trace-otlp-grpc');

jest.mock('@opentelemetry/sdk-trace-node', () => {
  const { NodeTracerProvider: ActualNodeTracerProvider } = jest.requireActual(
    '@opentelemetry/sdk-trace-node'
  );
  return {
    NodeTracerProvider: jest.fn(() => {
      const tracerProvider = new ActualNodeTracerProvider();
      jest.spyOn(tracerProvider, 'register');
      jest.spyOn(tracerProvider, 'addSpanProcessor');
      return tracerProvider;
    }),
  };
});

jest.mock('../../../src/server/utils/getOtelResourceAttributes', () => () => ({
  'test-resource-attribute': 'test-resource-attribute-value',
}));

let processSignalListeners = {};
jest.spyOn(process, 'on').mockImplementation((signal, cb) => {
  processSignalListeners[signal] = cb;
});
jest.spyOn(process, 'kill').mockImplementation((_pid, signal) => processSignalListeners[signal]());

const setup = ({
  logLevel = 'trace',
  nodeEnv = 'production',
  tracesEndpoint,
  traceAllRequests = false,
}) => {
  process.env.NODE_ENV = nodeEnv;
  if (tracesEndpoint) {
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = tracesEndpoint;
  } else {
    delete process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  }
  if (traceAllRequests) {
    process.env.ONE_TRACE_ALL_REQUESTS = 'true';
  } else {
    delete process.env.ONE_TRACE_ALL_REQUESTS;
  }
  jest.doMock('yargs', () => ({ argv: { logLevel } }));
  processSignalListeners = {};
  let tracer;
  jest.isolateModules(() => {
    tracer = require('../../../src/server/utils/tracer');
  });
  return tracer;
};

describe('tracer', () => {
  const nodeEnv = process.env.NODE_ENV;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterAll(() => {
    process.env.NODE_ENV = nodeEnv;
  });

  it('should export the tracer provider and batch processor', () => {
    const { NodeTracerProvider: ActualNodeTracerProvider } = jest.requireActual(
      '@opentelemetry/sdk-trace-node'
    );
    expect(setup({})).toEqual({
      _tracerProvider: expect.any(ActualNodeTracerProvider),
      _batchProcessor: expect.any(BatchSpanProcessor),
    });
  });

  it('should configure the tracer provider', () => {
    setup({});
    expect(NodeTracerProvider).toHaveBeenCalledTimes(1);
    expect(NodeTracerProvider).toHaveBeenCalledWith({
      sampler: expect.any(ParentBasedSampler),
      resource: expect.objectContaining({
        attributes: expect.objectContaining({
          'test-resource-attribute': 'test-resource-attribute-value',
        }),
      }),
    });
    expect(ParentBasedSampler).toHaveBeenCalledTimes(1);
    expect(ParentBasedSampler).toHaveBeenCalledWith({
      root: expect.any(TraceIdRatioBasedSampler),
    });
    expect(TraceIdRatioBasedSampler).toHaveBeenCalledTimes(1);
    expect(TraceIdRatioBasedSampler).toHaveBeenCalledWith(1);
  });

  it('should register instrumentations', () => {
    const { _tracerProvider } = setup({});
    expect(registerInstrumentations).toHaveBeenCalledTimes(1);
    expect(registerInstrumentations).toHaveBeenCalledWith({
      tracerProvider: _tracerProvider,
      instrumentations: [expect.any(HttpInstrumentation), expect.any(PinoInstrumentation)],
    });
    expect(_tracerProvider.register).toHaveBeenCalledTimes(1);
  });

  it('should not trace outgoing requests that do not have a parent span', () => {
    setup({});
    expect(HttpInstrumentation.mock.calls[0][0].requireParentforOutgoingSpans).toBe(true);
  });

  it('should trace outgoing requests that do not have a parent span when tracing all requests', () => {
    setup({ traceAllRequests: true });
    expect(HttpInstrumentation.mock.calls[0][0].requireParentforOutgoingSpans).toBe(false);
  });

  it('should ignore incoming requests for internal routes', () => {
    setup({});
    const { ignoreIncomingRequestHook } = HttpInstrumentation.mock.calls[0][0];
    expect(
      ignoreIncomingRequestHook({
        url: '/_/static/app/mockVersion/app.js',
        headers: { host: 'mock.host' },
      })
    ).toBe(true);
    expect(ignoreIncomingRequestHook({ url: '/mock-route', headers: { host: 'mock.host' } })).toBe(
      false
    );
  });

  it('should ignore requests to the dev CDN', () => {
    setup({});
    const { ignoreIncomingRequestHook } = HttpInstrumentation.mock.calls[0][0];
    expect(
      ignoreIncomingRequestHook({ url: '/mock-route', headers: { host: 'localhost:3001' } })
    ).toBe(true);
    expect(
      ignoreIncomingRequestHook({ url: '/mock-route', headers: { host: 'localhost:3000' } })
    ).toBe(false);
  });

  it('should not ignore incoming requests for internal routes or the dev CDN  when tracing all requests', () => {
    setup({ traceAllRequests: true });
    const { ignoreIncomingRequestHook } = HttpInstrumentation.mock.calls[0][0];
    expect(ignoreIncomingRequestHook).toBeUndefined();
  });

  it('should add request direction to HTTP requests', () => {
    setup({});
    const { startIncomingSpanHook, startOutgoingSpanHook } = HttpInstrumentation.mock.calls[0][0];
    expect(startIncomingSpanHook()).toMatchInlineSnapshot(`
      {
        "direction": "in",
      }
    `);
    expect(startOutgoingSpanHook()).toMatchInlineSnapshot(`
      {
        "direction": "out",
      }
    `);
  });

  it('should update span names for incoming and outgoing HTTP requests', () => {
    setup({});
    const startSpan = (spanName, { attributes }) => {
      const span = { name: spanName, attributes };
      span.updateName = (updatedName) => {
        span.name = updatedName;
      };
      return span;
    };
    const { requestHook } = HttpInstrumentation.mock.calls[0][0];
    const incomingSpan = startSpan('mock-incoming-span', {
      attributes: {
        direction: 'in',
        'http.method': 'GET',
        'http.target': '/mock-route',
      },
    });
    requestHook(incomingSpan);
    expect(incomingSpan.name).toMatchInlineSnapshot('"GET /mock-route"');
    const outgoingSpan = startSpan('mock-outgoing-span', {
      attributes: {
        direction: 'out',
        'http.method': 'POST',
        'http.url': 'http://localhost/mock-route',
      },
    });
    requestHook(outgoingSpan);
    expect(outgoingSpan.name).toMatchInlineSnapshot('"POST http://localhost/mock-route"');
  });

  it('should register a batch span processor with OTLP exporter when traces endpoint is set', () => {
    const { _tracerProvider } = setup({ tracesEndpoint: 'http://localhost:4317' });
    expect(BatchSpanProcessor).toHaveBeenCalledTimes(1);
    expect(BatchSpanProcessor).toHaveBeenCalledWith(expect.any(OTLPTraceExporter));
    expect(_tracerProvider.addSpanProcessor).toHaveBeenCalledTimes(2);
    expect(_tracerProvider.addSpanProcessor)
      .toHaveBeenNthCalledWith(1, expect.any(NoopSpanProcessor));
    expect(_tracerProvider.addSpanProcessor)
      .toHaveBeenNthCalledWith(2, expect.any(BatchSpanProcessor));
    expect(SimpleSpanProcessor).not.toHaveBeenCalled();
    expect(ConsoleSpanExporter).not.toHaveBeenCalled();
  });

  it('should register a simple span processor with console exporter when log level is trace in development', () => {
    const { _tracerProvider } = setup({ logLevel: 'trace', nodeEnv: 'development' });
    expect(SimpleSpanProcessor).toHaveBeenCalledTimes(1);
    expect(SimpleSpanProcessor).toHaveBeenCalledWith(expect.any(ConsoleSpanExporter));
    expect(_tracerProvider.addSpanProcessor).toHaveBeenCalledTimes(2);
    expect(_tracerProvider.addSpanProcessor)
      .toHaveBeenNthCalledWith(1, expect.any(NoopSpanProcessor));
    expect(_tracerProvider.addSpanProcessor)
      .toHaveBeenNthCalledWith(2, expect.any(SimpleSpanProcessor));
  });

  it('should not register a simple span processor with console exporter when log level is not trace', () => {
    const { _tracerProvider } = setup({ nodeEnv: 'development', logLevel: 'info' });
    expect(SimpleSpanProcessor).not.toHaveBeenCalled();
    expect(ConsoleSpanExporter).not.toHaveBeenCalled();
    expect(_tracerProvider.addSpanProcessor).toHaveBeenCalledTimes(1);
    expect(_tracerProvider.addSpanProcessor).toHaveBeenCalledWith(expect.any(NoopSpanProcessor));
  });

  it('should not register a simple span processor with console exporter when not in development', () => {
    const { _tracerProvider } = setup({ nodeEnv: 'production', logLevel: 'trace' });
    expect(SimpleSpanProcessor).not.toHaveBeenCalled();
    expect(ConsoleSpanExporter).not.toHaveBeenCalled();
    expect(_tracerProvider.addSpanProcessor).toHaveBeenCalledTimes(1);
    expect(_tracerProvider.addSpanProcessor).toHaveBeenCalledWith(expect.any(NoopSpanProcessor));
  });

  it('should register both batch and simple span processors when traces endpoint is set and log level is trace in development', () => {
    const { _tracerProvider } = setup({
      tracesEndpoint: 'http://localhost:4317',
      logLevel: 'trace',
      nodeEnv: 'development',
    });
    expect(BatchSpanProcessor).toHaveBeenCalledTimes(1);
    expect(BatchSpanProcessor).toHaveBeenCalledWith(expect.any(OTLPTraceExporter));
    expect(SimpleSpanProcessor).toHaveBeenCalledTimes(1);
    expect(SimpleSpanProcessor).toHaveBeenCalledWith(expect.any(ConsoleSpanExporter));
    expect(_tracerProvider.addSpanProcessor).toHaveBeenCalledTimes(3);
    expect(_tracerProvider.addSpanProcessor)
      .toHaveBeenNthCalledWith(1, expect.any(NoopSpanProcessor));
    expect(_tracerProvider.addSpanProcessor)
      .toHaveBeenNthCalledWith(2, expect.any(BatchSpanProcessor));
    expect(_tracerProvider.addSpanProcessor)
      .toHaveBeenNthCalledWith(3, expect.any(SimpleSpanProcessor));
  });

  it('should shutdown the batch span processor when a SIGINT signal is received', async () => {
    const { _batchProcessor } = setup({ tracesEndpoint: 'http://localhost:4317' });
    expect(process.on).toHaveBeenCalledTimes(2);
    await process.kill(process.pid, 'SIGINT');
    expect(_batchProcessor.shutdown).toHaveBeenCalledTimes(1);
  });

  it('should shutdown the batch span processor when a SIGTERM signal is received', async () => {
    const { _batchProcessor } = setup({ tracesEndpoint: 'http://localhost:4317' });
    expect(process.on).toHaveBeenCalledTimes(2);
    await process.kill(process.pid, 'SIGTERM');
    expect(_batchProcessor.shutdown).toHaveBeenCalledTimes(1);
  });
});
