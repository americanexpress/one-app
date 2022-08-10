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

import express from 'express';
import Fastify from 'fastify';
import fp from 'fastify-plugin'
import helmet from '@fastify/helmet';
// import fastifyExpress from '@fastify/express';
// import rateLimit from 'express-rate-limit';
import { register as metricsRegister, collectDefaultMetrics } from 'prom-client';

import logging from './utils/logging/fastifyPlugin';
import healthCheck from './plugins/healthCheck';

collectDefaultMetrics();

const makeExpressRouter = () => {
  const router = express.Router();

  // router.use(helmet());
  // router.use(logging);
  // router.use(rateLimit({
  //   windowMs: 1000,
  //   max: 10,
  // }));

  // router.get('/im-up', healthCheck);

  // router.get('/metrics', async (_req, res) => {
  //   res.set('Content-Type', metricsRegister.contentType);
  //   res.end(await metricsRegister.metrics());
  // });

  // router.use('/', (_req, res) => res.status(404).set('Content-Type', 'text/plain').send(''));

  return router;
};

export async function createMetricsServer() {
  const fastify = Fastify();

  await fastify.register(fp(logging));
  await fastify.register(helmet);
  await fastify.register(healthCheck);

  fastify.get('/metrics', async (_request, reply) => {
    reply
      .header('Content-Type', metricsRegister.contentType)
      .send(await metricsRegister.metrics());
  });

  fastify.get('/', (_request, reply) => {
    reply.code(404).send('')
  });

  return fastify;
}

export default createMetricsServer;
