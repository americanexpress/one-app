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

import ensureCorrelationId from '../../../src/server/plugins/ensureCorrelationId';

describe('ensureCorrelationId', () => {
  function generateSamples() {
    const request = {
      headers: {},
    };

    const fastify = {
      addHook: jest.fn((_hookName, cb) => {
        cb(request);
      }),
    };

    return { fastify, request };
  }

  it('uses correlation_id for correlation-id on a request without correlation-id', () => {
    const { fastify, request } = generateSamples();
    delete request.headers['correlation-id'];
    request.headers.correlation_id = 'cloudy';
    ensureCorrelationId(fastify, null, jest.fn());
    expect(request.headers).toHaveProperty('correlation-id', 'cloudy');
  });

  it('uses unique_id for correlation-id on a request without correlation-id or correlation_id', () => {
    const { fastify, request } = generateSamples();
    delete request.headers['correlation-id'];
    delete request.headers.correlation_id;
    request.headers.unique_id = 'thunderstorms';
    ensureCorrelationId(fastify, null, jest.fn());
    expect(request.headers).toHaveProperty('correlation-id', 'thunderstorms');
  });

  it('adds a correlation-id header to a request without anything', () => {
    const { fastify, request } = generateSamples();
    delete request.headers['correlation-id'];
    ensureCorrelationId(fastify, null, jest.fn());
    expect(request.headers).toHaveProperty('correlation-id');
    expect(typeof request.headers['correlation-id']).toBe('string');
  });

  it('does not change an existing correlation-id header on a request', () => {
    const { fastify, request } = generateSamples();
    request.headers['correlation-id'] = 'exists';
    ensureCorrelationId(fastify, null, jest.fn());
    expect(request.headers).toHaveProperty('correlation-id', 'exists');
  });
});
