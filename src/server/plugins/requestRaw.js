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

import fp from 'fastify-plugin';

/**
 * Fastify Plugin for req/res exposure backward compatibility
 * @param {import('fastify').FastifyInstance} fastify Fastify instance
 */
const requestRaw = async (fastify) => {
  // NOTE: this is needed for backward compatibility since
  //       we were exposing the 'req' and 'res' from ExpressJS
  //       to the App Config.
  fastify.addHook('onRequest', async (request, reply) => {
    request.raw.originalUrl = request.raw.url;
    request.raw.id = request.id;
    request.raw.hostname = request.hostname;
    request.raw.ip = request.ip;
    request.raw.ips = request.ips;
    request.raw.log = request.log;
    // eslint-disable-next-line no-param-reassign
    reply.raw.log = request.log;

    // backward compatibility for body-parser
    if (request.body) {
      request.raw.body = request.body;
    }
    // backward compatibility for cookie-parser
    if (request.cookies) {
      request.raw.cookies = request.cookies;
    }

    // Make it lazy as it does a bit of work
    Object.defineProperty(request.raw, 'protocol', {
      get() {
        return request.protocol;
      },
    });
  });
};

export default fp(requestRaw, {
  fastify: '4.x',
  name: 'requestRaw',
});
