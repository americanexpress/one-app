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

import * as openTelemetry from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import Fastify from 'fastify';
import { kRegisteredPlugins } from 'fastify/lib/pluginUtils';
import tracer from '../../../src/server/plugins/tracer';

const tracerProvider = new NodeTracerProvider();
registerInstrumentations({
  tracerProvider,
  instrumentations: [new HttpInstrumentation()],
});

jest.spyOn(openTelemetry, 'isValidTraceId');

describe('tracer', () => {
  beforeAll(() => tracerProvider.register());
  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => tracerProvider.shutdown());

  it('should register the OTel plugin', async () => {
    const fastify = Fastify();
    fastify.register(tracer);
    await fastify.ready();
    expect(fastify[kRegisteredPlugins]).toMatchInlineSnapshot(`
      [
        "tracer",
        "fastify-opentelemetry",
      ]
    `);
    return fastify.close();
  });

  it("should wrap other hooks and handlers in the active span's context", async () => {
    expect.assertions(4);
    let activeSpan;
    let onRequestSpan;
    let preHandlerSpan;
    let routeHandlerSpan;
    const fastify = Fastify();
    fastify.register(tracer);
    fastify.addHook('onRequest', async (request) => {
      activeSpan = request.openTelemetry().activeSpan;
      onRequestSpan = request.openTelemetry().tracer.startSpan('onRequestSpan');
      onRequestSpan.end();
    });
    fastify.addHook('preHandler', async (request) => {
      preHandlerSpan = request.openTelemetry().tracer.startSpan('preHandlerSpan');
      preHandlerSpan.end();
    });
    fastify.get('/test', async (request, reply) => {
      routeHandlerSpan = request.openTelemetry().tracer.startSpan('routeHandlerSpan');
      routeHandlerSpan.end();
      return reply.send('success');
    });
    await fastify.ready();
    const response = await fastify.inject({ method: 'GET', url: '/test' });
    const activeSpanId = activeSpan.spanContext().spanId;
    expect(onRequestSpan.parentSpanId).toBe(activeSpanId);
    expect(preHandlerSpan.parentSpanId).toBe(activeSpanId);
    expect(routeHandlerSpan.parentSpanId).toBe(activeSpanId);
    expect(response.statusCode).toBe(200);
    return fastify.close();
  });

  it('should add a traceid header to the response', async () => {
    expect.assertions(3);
    let traceId;
    const fastify = Fastify();
    fastify.register(tracer);
    fastify.get('/test', async (request, reply) => {
      ({ traceId } = request.openTelemetry().activeSpan.spanContext());
      return reply.send('success');
    });
    await fastify.ready();
    const response = await fastify.inject({ method: 'GET', url: '/test' });
    expect(response.statusCode).toBe(200);
    expect(traceId).not.toBeUndefined();
    expect(response.headers.traceid).toBe(traceId);
    return fastify.close();
  });

  it('should not add a traceid header to the response when there is no valid trace', async () => {
    expect.assertions(2);
    const fastify = Fastify();
    fastify.register(tracer);
    fastify.get('/test', async (_request, reply) => reply.send('success'));
    await fastify.ready();
    openTelemetry.isValidTraceId.mockReturnValueOnce(false);
    const response = await fastify.inject({ method: 'GET', url: '/test' });
    expect(response.statusCode).toBe(200);
    expect(response.headers.traceid).toBeUndefined();
    return fastify.close();
  });

  it('should set request.tracingEnabled to true', async () => {
    expect.assertions(2);
    const fastify = Fastify();
    fastify.register(tracer);
    fastify.get('/test', async (request, reply) => {
      expect(request.tracingEnabled).toBe(true);
      return reply.send('success');
    });
    await fastify.ready();
    const response = await fastify.inject({ method: 'GET', url: '/test' });
    expect(response.statusCode).toBe(200);
    return fastify.close();
  });
});
