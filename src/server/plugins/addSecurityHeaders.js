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

/**
 * Fastify Plugin that adds security into headers
 * @param {import('fastify').FastifyInstance} fastify Fastify instance
 * @param {import('fastify').FastifyPluginOptions} _opts plugin options
 * @param {import('fastify').FastifyPluginCallback} done plugin callback
 */
const addSecurityHeaders = (fastify, opts = {}, done) => {
  const ignoreRoutes = opts.ignoreRoutes || [];

  fastify.addHook('onRequest', async (request, reply) => {
    reply.header('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    reply.header('x-dns-prefetch-control', 'off');
    reply.header('x-download-options', 'noopen');
    reply.header('x-permitted-cross-domain-policies', 'none');
    reply.header('X-Content-Type-Options', 'nosniff');

    if (!ignoreRoutes.includes(request.url)) {
      reply.header('X-Frame-Options', 'DENY');
      reply.header('X-XSS-Protection', '1; mode=block');
      reply.header('Referrer-Policy', process.env.ONE_REFERRER_POLICY_OVERRIDE || 'same-origin');
    } else {
      reply.header('referrer-policy', 'no-referrer');
      reply.header('x-frame-options', 'SAMEORIGIN');
      reply.header('x-xss-protection', '0');
    }
  });

  done();
};

export default fp(addSecurityHeaders, {
  fastify: '4.x',
  name: 'addSecurityHeaders',
});
