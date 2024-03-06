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
import { isValidTraceId } from '@opentelemetry/api';
import openTelemetryPlugin from '@autotelic/fastify-opentelemetry';

/**
 * Fastify Plugin that sets up tracing
 * @param {import('fastify').FastifyInstance} fastify Fastify instance
 */
const tracer = async (fastify) => {
  fastify.register(openTelemetryPlugin, { wrapRoutes: true });
  fastify.addHook('onRequest', async (request, reply) => {
    const { traceId } = request.openTelemetry().activeSpan.spanContext();
    if (isValidTraceId(traceId)) reply.header('traceid', traceId);
  });
  fastify.decorateRequest('tracingEnabled', true);
};

export default fp(tracer, {
  fastify: '4.x',
  name: 'tracer',
});
