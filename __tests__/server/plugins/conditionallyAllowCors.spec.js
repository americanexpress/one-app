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

// Dangling underscores are part of the HTTP mocks API
/* eslint-disable no-underscore-dangle */
import httpMocks from 'node-mocks-http';
import fastifyCors from '@fastify/cors';
import { fromJS } from 'immutable';
import conditionallyAllowCors, { setCorsOrigins } from '../../../src/server/plugins/conditionallyAllowCors';

const { NODE_ENV } = process.env;
let state = fromJS({ rendering: {} });
let request;
const span = { end: jest.fn() };
const tracer = { startSpan: jest.fn(() => span) };

const setup = ({ renderPartialOnly, origin }) => {
  state = state.update('rendering', (rendering) => rendering.set('renderPartialOnly', renderPartialOnly));
  request = httpMocks.createRequest({
    headers: {
      Origin: origin,
    },
  });
  request.store = { getState: () => state };
  request.openTelemetry = () => ({ tracer });
};

describe('conditionallyAllowCors', () => {
  beforeEach(() => jest.clearAllMocks());
  afterAll(() => {
    process.env.NODE_ENV = NODE_ENV;
  });

  it('allows CORS for HTML partials', async () => {
    delete process.env.NODE_ENV;
    setup({ renderPartialOnly: true, origin: 'test.example.com' });
    setCorsOrigins([/\.example.com$/]);

    const callback = jest.fn();
    const fastify = {
      register: jest.fn((_plugin, { delegator }) => {
        delegator(request, callback);
      }),
    };

    await conditionallyAllowCors(fastify);

    expect(fastify.register).toHaveBeenCalledTimes(1);
    expect(fastify.register).toHaveBeenCalledWith(fastifyCors, { hook: 'preHandler', delegator: expect.any(Function) });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(null, { origin: [/\.example.com$/] });
  });

  it('allows CORS for localhost in development', async () => {
    process.env.NODE_ENV = 'development';
    setup({ renderPartialOnly: true, origin: 'localhost:8000' });
    setCorsOrigins([/\.example.com$/]);

    const callback = jest.fn();
    const fastify = {
      register: jest.fn((_plugin, { delegator }) => {
        delegator(request, callback);
      }),
    };

    await conditionallyAllowCors(fastify);

    expect(callback).toHaveBeenCalledWith(null, { origin: [/\.example.com$/, /localhost:\d{1,5}/] });
  });

  it('does not allow CORS for localhost in production', async () => {
    process.env.NODE_ENV = 'production';
    setup({ renderPartialOnly: true, origin: 'localhost:8000' });

    const callback = jest.fn();
    const fastify = {
      register: jest.fn((_plugin, { delegator }) => {
        delegator(request, callback);
      }),
    };

    await conditionallyAllowCors(fastify);

    expect(callback).toHaveBeenCalledWith(null, { origin: [/\.example.com$/, /localhost:\d{1,5}/] });
  });

  it('does not allow CORS non-partial requests', async () => {
    setup({ renderPartialOnly: false, origin: 'test.example.com' });

    const callback = jest.fn();
    const fastify = {
      register: jest.fn((_plugin, { delegator }) => {
        delegator(request, callback);
      }),
    };

    await conditionallyAllowCors(fastify);

    expect(callback).toHaveBeenCalledWith(null, { origin: false });
  });

  it('adds a tracer span', async () => {
    delete process.env.NODE_ENV;
    setup({ renderPartialOnly: true, origin: 'test.example.com' });
    setCorsOrigins([/\.example.com$/]);

    const callback = jest.fn();
    const fastify = {
      register: jest.fn((_plugin, { delegator }) => {
        delegator(request, callback);
      }),
    };

    await conditionallyAllowCors(fastify);

    expect(tracer.startSpan).toHaveBeenCalledTimes(1);
    expect(tracer.startSpan).toHaveBeenCalledWith('conditionallyAllowCors');
    expect(span.end).toHaveBeenCalledTimes(1);
  });
});
