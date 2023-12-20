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

import fp from 'fastify-plugin';

/**
 * Fastify Plugin that injects a noop tracer into the request object
 * @param {import('fastify').FastifyInstance} fastify Fastify instance
 */
const noopTracer = (fastify, _opts, done) => {
  function openTelemetry() {
    return {
      get tracer() {
        const noop = () => { };
        const createNoopSpan = () => ({
          addAttribute: noop,
          end: noop,
        });
        return {
          startSpan: createNoopSpan,
          startActiveSpan: (name, cb) => cb(createNoopSpan()),
        };
      },
    };
  }
  fastify.decorateRequest('openTelemetry', openTelemetry);
  done();
};

export default fp(noopTracer, {
  fastify: '4.x',
  name: 'noopTracer',
});
