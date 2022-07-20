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
import helmet from 'helmet';
import Fastify from 'fastify';
import fastifyExpress from '@fastify/express';
import { register as metricsRegister, collectDefaultMetrics } from 'prom-client';

import logging from './utils/logging/serverMiddleware';
import healthCheck from './middleware/healthCheck';

collectDefaultMetrics();

const makeExpressRouter = () => {
  const router = express.Router();

  router.use(helmet());
  router.use(logging);

  router.get('/im-up', healthCheck);

  router.get('/metrics', async (_req, res) => {
    res.set('Content-Type', metricsRegister.contentType);
    res.end(await metricsRegister.metrics());
  });

  router.use('/', (_req, res) => res.status(404).set('Content-Type', 'text/plain').send(''));

  return router;
};

export async function createMetricsServer() {
  const fastify = Fastify();

  await fastify.register(fastifyExpress);

  fastify.express.disable('x-powered-by');
  fastify.express.disable('e-tag');

  fastify.use(makeExpressRouter());

  return fastify;
}

export default createMetricsServer;
