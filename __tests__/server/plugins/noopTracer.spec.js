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
import noopTracer from '../../../src/server/plugins/noopTracer';

describe('noopTracer', () => {
  it('should add openTelemetry noop functions to the request object', async () => {
    const fastify = Fastify();
    await fastify.register(noopTracer);

    fastify.get('/test-route', (request, reply) => {
      const { tracer } = request.openTelemetry();
      const fooSpan = tracer.startSpan('foo');
      fooSpan.end();
      tracer.startActiveSpan('bar', (barSpan) => {
        const bazSpan = tracer.startSpan(`${barSpan.name} -> baz`, { attributes: { fizz: 'buzz' } });
        bazSpan.end();
        barSpan.end();
      });
      return reply.code(200).send();
    });

    await fastify.ready();

    const response = await fastify.inject({
      method: 'GET',
      url: '/test-route',
    });

    expect(response.statusCode).toEqual(200);
  });
});
