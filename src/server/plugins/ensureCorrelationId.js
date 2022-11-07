/*
 * Copyright 2022 American Express Travel Related Services Company, Inc.
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
import { v4 as uuidV4 } from 'uuid';

/**
 * Fastify Plugin that adds correlation id into headers
 * @param {import('fastify').FastifyInstance} fastify Fastify instance
 * @param {import('fastify').FastifyPluginOptions} _opts plugin options
 * @param {import('fastify').FastifyPluginCallback} done plugin callback
 */
const ensureCorrelationId = (fastify, _opts, done) => {
  fastify.addHook('onRequest', async (request) => {
    if (!request.headers['correlation-id']) {
      request.headers['correlation-id'] = request.headers.correlation_id
        || request.headers.unique_id
        || uuidV4();
    }
  });

  done();
};

export default fp(ensureCorrelationId, {
  fastify: '4.x',
  name: 'ensureCorrelationId',
});
