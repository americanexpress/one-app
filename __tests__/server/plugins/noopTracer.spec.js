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

import Fastify from 'fastify';
import fastifyOpenTelemetry from '@autotelic/fastify-opentelemetry';
import noopTracer from '../../../src/server/plugins/noopTracer';

describe('noopTracer', () => {
  const getTypes = (obj) => Object.entries(obj).reduce((acc, [key, val]) => ({
    ...acc,
    [key]: typeof val,
  }), {});

  let noopApi;
  let actualApi;
  let actualSpan;
  let noopSpan;
  let actualSpanProperties;

  beforeAll(async () => {
    const fastify = Fastify();
    fastify.register((instance, opts, done) => {
      instance.register(noopTracer);
      instance.get('/test-noop', async (request, reply) => {
        noopApi = { ...request.openTelemetry() };
        noopSpan = noopApi.tracer.startSpan('foo', { attributes: { bar: 'baz' } });
        noopSpan.end();
        return reply.send();
      });
      done();
    });
    fastify.register(async (instance, opts, done) => {
      instance.register(fastifyOpenTelemetry, { wrapRoutes: true });
      instance.get('/test-actual', (request, reply) => {
        actualApi = { ...request.openTelemetry() };
        actualSpan = actualApi.tracer.startSpan('foo', { attributes: { bar: 'baz' } });
        actualSpan.end();
        return reply.send();
      });
      done();
    });
    await fastify.ready();

    await fastify.inject({ method: 'GET', url: '/test-noop' });
    await fastify.inject({ method: 'GET', url: '/test-actual' });

    actualSpanProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(actualSpan))
      .filter((propertyName) => propertyName !== 'constructor')
      .reduce((acc, property) => ({ ...acc, [property]: actualSpan[property] }), {});
  });

  beforeEach(() => jest.clearAllMocks());

  it('should have API keys of the same type', () => {
    expect(getTypes(actualApi)).toMatchInlineSnapshot(`
      {
        "activeSpan": "object",
        "context": "object",
        "extract": "function",
        "inject": "function",
        "tracer": "object",
      }
    `);
    expect(getTypes(noopApi)).toEqual(getTypes(actualApi));
  });

  it('should return the same types from API methods', () => {
    expect(typeof actualApi.inject()).toBe(typeof noopApi.inject());
    expect(typeof actualApi.extract()).toBe(typeof noopApi.extract());

    expect(actualApi.activeSpan.constructor).toBe(actualSpan.constructor);
    expect(noopApi.activeSpan).toBe(noopSpan);

    const actualStartActiveSpanCb = jest.fn();
    expect(actualApi.tracer.startActiveSpan('span name', actualStartActiveSpanCb)).toBe(undefined);
    expect(actualStartActiveSpanCb.mock.calls[0][0].constructor).toBe(actualSpan.constructor);
    const noopStartActiveSpanCb = jest.fn();
    expect(noopApi.tracer.startActiveSpan('span name', noopStartActiveSpanCb)).toBe(undefined);
    expect(noopStartActiveSpanCb.mock.calls[0][0]).toBe(noopSpan);
  });

  it('should create a span with similar properties', () => {
    expect(getTypes(actualSpanProperties)).toMatchInlineSnapshot(`
      {
        "addEvent": "function",
        "end": "function",
        "isRecording": "function",
        "recordException": "function",
        "setAttribute": "function",
        "setAttributes": "function",
        "setStatus": "function",
        "spanContext": "function",
        "updateName": "function",
      }
    `);
    expect(getTypes(noopSpan)).toEqual(getTypes(actualSpanProperties));
  });

  it('should return the same types from span methods', () => {
    const methodNames = Object.keys(actualSpanProperties).filter(
      (property) => typeof actualSpan[property] === 'function' && property !== 'contructor'
    );

    methodNames.forEach((methodName) => {
      jest.spyOn(actualSpan, methodName).mockName(`actualSpan.${methodName}`);
      jest.spyOn(noopSpan, methodName).mockName(`noopSpan.${methodName}`);
    });

    expect(actualSpan.addEvent('event name')).toBe(actualSpan);
    expect(noopSpan.addEvent('event name')).toBe(noopSpan);

    expect(actualSpan.setAttribute('key', 'value')).toBe(actualSpan);
    expect(noopSpan.setAttribute('key', 'value')).toBe(noopSpan);

    expect(actualSpan.setAttributes({ key: 'value', fizz: 'buzz' })).toBe(actualSpan);
    expect(noopSpan.setAttributes({ key: 'value', fizz: 'buzz' })).toBe(noopSpan);

    expect(actualSpan.setStatus(1)).toBe(actualSpan);
    expect(noopSpan.setStatus(1)).toBe(noopSpan);

    expect(actualSpan.updateName('updated name')).toBe(actualSpan);
    expect(noopSpan.updateName('updated name')).toBe(noopSpan);

    expect(actualSpan.end()).toBe(undefined);
    expect(noopSpan.end()).toBe(undefined);

    expect(actualSpan.recordException({ code: 1 })).toBe(undefined);
    expect(noopSpan.recordException({ code: 1 })).toBe(undefined);

    expect(typeof actualSpan.isRecording()).toBe('boolean');
    expect(noopSpan.isRecording()).toBe(false);

    expect(typeof actualSpan.spanContext()).toBe('object');
    expect(noopSpan.spanContext()).toBe(undefined);

    methodNames.forEach((methodName) => {
      expect(actualSpan[methodName]).toHaveBeenCalled();
      expect(noopSpan[methodName]).toHaveBeenCalled();
    });
  });
});
