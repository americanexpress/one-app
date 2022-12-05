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

import fp from 'fastify-plugin';
import matcher from 'matcher';

import { getCSP } from './csp';

/**
 * Fastify Plugin that adds frame options into the header
 * @param {import('fastify').FastifyInstance} fastify Fastify instance
 * @param {import('fastify').FastifyPluginOptions} _opts plugin options
 * @param {import('fastify').FastifyPluginCallback} done plugin callback
 */
const addFrameOptionsHeader = (fastify, _opts, done) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const referer = request.headers.Referer || request.headers.Referrer || '';
    const frameAncestorDomains = getCSP()['frame-ancestors'] || [];
    const trimmedReferrer = referer.replace('https://', '');
    const matchedDomain = frameAncestorDomains.find((domain) => matcher.isMatch(trimmedReferrer, `${domain}/*`)
    );

    if (matchedDomain) {
      reply.header('X-Frame-Options', `ALLOW-FROM ${referer}`);
    }
  });

  done();
};

export default fp(addFrameOptionsHeader, {
  fastify: '4.x',
  name: 'addFrameOptionsHeader',
});
