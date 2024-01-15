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
import { DnsInstrumentation } from '@opentelemetry/instrumentation-dns';
import {
  BatchSpanProcessor,
  SimpleSpanProcessor,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  ConsoleSpanExporter,
} from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

jest.mock('@opentelemetry/instrumentation');
jest.mock('@opentelemetry/instrumentation-http');
jest.mock('@opentelemetry/instrumentation-pino');
jest.mock('@opentelemetry/sdk-trace-node', () => {
  const { NodeTracerProvider: ActualNodeTracerProvider } = jest.requireActual('@opentelemetry/sdk-trace-node');
  return {
    NodeTracerProvider: jest.fn(() => {
      const tracerProvider = new ActualNodeTracerProvider();
      tracerProvider.register = jest.fn();
      tracerProvider.addSpanProcessor = jest.fn();
      return tracerProvider;
    }),
  };
});
jest.mock('@opentelemetry/instrumentation-dns');
jest.mock('@opentelemetry/sdk-trace-base');
jest.mock('@opentelemetry/exporter-trace-otlp-grpc');

jest.mock('../../../src/server/utils/getOtelResourceAttributes', () => () => ({ 'test-resource-attribute': 'test-resource-attribute-value' }));

let processSignalListeners = {};
jest.spyOn(process, 'on').mockImplementation((signal, cb) => { processSignalListeners[signal] = cb; });
jest.spyOn(process, 'kill').mockImplementation((_pid, signal) => processSignalListeners[signal]());

const setup = ({
  logLevel = 'trace',
  nodeEnv = 'production',
  tracesEndpoint,
}) => {
  process.env.NODE_ENV = nodeEnv;
  if (tracesEndpoint) {
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = tracesEndpoint;
  } else {
    delete process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
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
    const { NodeTracerProvider: ActualNodeTracerProvider } = jest.requireActual('@opentelemetry/sdk-trace-node');
    expect(setup({})).toEqual({
      _tracerProvider: expect.any(ActualNodeTracerProvider),
      _tracerProcessor: expect.any(BatchSpanProcessor),
    });
  });

  it('should configure the tracer provider', () => {
    setup({});
    expect(NodeTracerProvider).toHaveBeenCalledTimes(1);
    expect(NodeTracerProvider).toHaveBeenCalledWith({
      sampler: expect.any(ParentBasedSampler),
      resource: { attributes: { 'test-resource-attribute': 'test-resource-attribute-value' } },
    });
    expect(ParentBasedSampler).toHaveBeenCalledTimes(1);
    expect(ParentBasedSampler).toHaveBeenCalledWith({
      root: expect.any(TraceIdRatioBasedSampler),
    });
    expect(TraceIdRatioBasedSampler).toHaveBeenCalledTimes(1);
    expect(TraceIdRatioBasedSampler).toHaveBeenCalledWith(0.1);
  });

  it('should register instrumentations', () => {
    const { _tracerProvider } = setup({});
    expect(registerInstrumentations).toHaveBeenCalledTimes(1);
    expect(registerInstrumentations).toHaveBeenCalledWith({
      tracerProvider: _tracerProvider,
      instrumentations: [
        expect.any(HttpInstrumentation),
        expect.any(DnsInstrumentation),
        expect.any(PinoInstrumentation),
      ],
    });
    expect(_tracerProvider.register).toHaveBeenCalledTimes(1);
  });

  it('should register a batch span processor with OTLP exporter when traces endpoint is set', () => {
    const { _tracerProvider } = setup({ tracesEndpoint: 'http://localhost:4317' });
    expect(BatchSpanProcessor).toHaveBeenCalledTimes(1);
    expect(BatchSpanProcessor).toHaveBeenCalledWith(expect.any(OTLPTraceExporter));
    expect(_tracerProvider.addSpanProcessor).toHaveBeenCalledTimes(1);
    expect(_tracerProvider.addSpanProcessor).toHaveBeenCalledWith(expect.any(BatchSpanProcessor));
    expect(SimpleSpanProcessor).not.toHaveBeenCalled();
    expect(ConsoleSpanExporter).not.toHaveBeenCalled();
  });

  it('should register a simple span processor with console exporter when log level is trace in development', () => {
    const { _tracerProvider } = setup({ logLevel: 'trace', nodeEnv: 'development' });
    expect(SimpleSpanProcessor).toHaveBeenCalledTimes(1);
    expect(SimpleSpanProcessor).toHaveBeenCalledWith(expect.any(ConsoleSpanExporter));
    expect(_tracerProvider.addSpanProcessor).toHaveBeenCalledTimes(1);
    expect(_tracerProvider.addSpanProcessor).toHaveBeenCalledWith(expect.any(SimpleSpanProcessor));
  });

  it('should not register a simple span processor with console exporter when log level is not trace', () => {
    const { _tracerProvider } = setup({ nodeEnv: 'development', logLevel: 'info' });
    expect(SimpleSpanProcessor).not.toHaveBeenCalled();
    expect(ConsoleSpanExporter).not.toHaveBeenCalled();
    expect(_tracerProvider.addSpanProcessor).not.toHaveBeenCalled();
  });

  it('should not register a simple span processor with console exporter when not in development', () => {
    const { _tracerProvider } = setup({ nodeEnv: 'production', logLevel: 'trace' });
    expect(SimpleSpanProcessor).not.toHaveBeenCalled();
    expect(ConsoleSpanExporter).not.toHaveBeenCalled();
    expect(_tracerProvider.addSpanProcessor).not.toHaveBeenCalled();
  });

  it('should register both batch and simple span processors when traces endpoint is set and log level is trace in development', () => {
    const { _tracerProvider } = setup({ tracesEndpoint: 'http://localhost:4317', logLevel: 'trace', nodeEnv: 'development' });
    expect(BatchSpanProcessor).toHaveBeenCalledTimes(1);
    expect(BatchSpanProcessor).toHaveBeenCalledWith(expect.any(OTLPTraceExporter));
    expect(SimpleSpanProcessor).toHaveBeenCalledTimes(1);
    expect(SimpleSpanProcessor).toHaveBeenCalledWith(expect.any(ConsoleSpanExporter));
    expect(_tracerProvider.addSpanProcessor).toHaveBeenCalledTimes(2);
    expect(_tracerProvider.addSpanProcessor).toHaveBeenCalledWith(expect.any(BatchSpanProcessor));
    expect(_tracerProvider.addSpanProcessor).toHaveBeenCalledWith(expect.any(SimpleSpanProcessor));
  });

  it('should shutdown the batch span processor when a SIGINT signal is received', async () => {
    const { _tracerProcessor } = setup({ tracesEndpoint: 'http://localhost:4317' });
    expect(process.on).toHaveBeenCalledTimes(2);
    await process.kill(process.pid, 'SIGINT');
    expect(_tracerProcessor.shutdown).toHaveBeenCalledTimes(1);
  });

  it('should shutdown the batch span processor when a SIGTERM signal is received', async () => {
    const { _tracerProcessor } = setup({ tracesEndpoint: 'http://localhost:4317' });
    expect(process.on).toHaveBeenCalledTimes(2);
    await process.kill(process.pid, 'SIGTERM');
    expect(_tracerProcessor.shutdown).toHaveBeenCalledTimes(1);
  });
});
