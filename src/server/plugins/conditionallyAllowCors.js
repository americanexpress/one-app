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

import fastifyCors from '@fastify/cors';

const devOrigin = /localhost:\d{1,5}/;
let corsOrigins = [];

export const setCorsOrigins = (newCorsOrigins = []) => {
  corsOrigins = process.env.NODE_ENV === 'development'
    ? [...newCorsOrigins, devOrigin]
    : newCorsOrigins;
};

setCorsOrigins();

const corsOriginsIncludes = (originHeader) => corsOrigins.some((originStringOrRegExp) => {
  if (originHeader === originStringOrRegExp || originStringOrRegExp === '*') return true;
  if (typeof originStringOrRegExp.test === 'function') return originStringOrRegExp.test(originHeader);
  return false;
});

/**
 * Sets configurable cors when 'renderPartialOnly' is enabled
 * @param {import('fastify').FastifyInstance} fastify app instance
 */
const conditionallyAllowCors = async (fastify) => {
  await fastify.register(fastifyCors, {
    hook: 'preHandler',
    delegator: (req, callback) => {
      const { tracer } = req.openTelemetry();
      const span = tracer.startSpan('conditionallyAllowCors');
      const renderPartialOnly = req.store && req.store.getState().getIn(['rendering', 'renderPartialOnly']);
      // The HTML partials will have CORS enabled so they can be loaded client-side
      const origin = renderPartialOnly ? corsOriginsIncludes(req.headers.origin) : false;
      span.end();
      callback(null, { origin });
    },
  });
};

export default conditionallyAllowCors;
