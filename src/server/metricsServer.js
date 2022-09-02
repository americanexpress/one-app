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

import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { register as metricsRegister, collectDefaultMetrics } from 'prom-client';

import logging from './utils/logging/fastifyPlugin';
import healthCheck from './plugins/healthCheck';

collectDefaultMetrics();

export async function createMetricsServer() {
  const fastify = Fastify();

  await fastify.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });
  await fastify.register(logging);
  await fastify.register(helmet);
  await fastify.register(healthCheck);

  fastify.get('/metrics', async (_request, reply) => {
    reply
      .header('Content-Type', metricsRegister.contentType)
      .send(await metricsRegister.metrics());
  });

  fastify.get('/im-up', async (_request, reply) => {
    await reply.healthReport();
  });

  fastify.setNotFoundHandler((_request, reply) => {
    reply.code(404).send('');
  });

  return fastify;
}

export default createMetricsServer;
