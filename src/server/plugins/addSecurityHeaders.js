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

const addSecurityHeaders = (fastify, _opts, done) => {
  fastify.addHook('onRequest', async (_request, reply) => {
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', process.env.ONE_REFERRER_POLICY_OVERRIDE || 'same-origin');
  })

  done();
}

export default fp(addSecurityHeaders, {
  fastify: '4.x',
  name: 'addSecurityHeaders'
})
