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

// We need to conditionally require in this fault based on whether we are in a
// development or production environment
/* eslint-disable global-require */

import path from 'path';

import express from 'express';
import compress from '@fastify/compress';
import compression from 'compression'
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { json, urlencoded } from 'body-parser';
import helmet from 'helmet';
import Fastify from 'fastify';
import fastifyExpress from '@fastify/express';
import fastifyCookie from '@fastify/cookie';

import ensureCorrelationId from './plugins/ensureCorrelationId';
import setAppVersionHeader from './plugins/setAppVersionHeader';
import clientErrorLogger from './middleware/clientErrorLogger';
import oneApp from '../universal';
import addSecurityHeaders from './middleware/addSecurityHeaders';
import addSecurityHeadersPlugin from './plugins/addSecurityHeaders';
import addCacheHeaders from './middleware/addCacheHeaders';
import csp from './middleware/csp';
import cspViolation from './middleware/cspViolation';
import logging from './utils/logging/serverMiddleware';
import forwardedHeaderParser from './plugins/forwardedHeaderParser';
import {
  serviceWorkerMiddleware,
  webManifestMiddleware,
  offlineMiddleware,
} from './middleware/pwa';
import reactHtml, { renderStaticErrorPage } from './plugins/reactHtml'
import addFrameOptionsHeader from './middleware/addFrameOptionsHeader'
import createRequestStore from './middleware/createRequestStore'
import createRequestHtmlFragment from './middleware/createRequestHtmlFragment';
import conditionallyAllowCors from './middleware/conditionallyAllowCors';
import checkStateForRedirect from './middleware/checkStateForRedirect';
import checkStateForStatusCode from './middleware/checkStateForStatusCode';
import sendHtml from './middleware/sendHtml';

export const makeExpressRouter = (router = express.Router()) => {
  const enablePostToModuleRoutes = process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES === 'true';

  router.use(logging);
  router.use(compression());
  // router.get('*', addSecurityHeaders);
  // router.use(setAppVersionHeader);
  // router.use(forwardedHeaderParser);

  router.use('/_/static', express.static(path.join(__dirname, '../../build'), { maxage: '182d' }));
  router.get('/_/status', (_req, res) => res.sendStatus(200));
  router.get('/_/pwa/service-worker.js', serviceWorkerMiddleware());
  router.get('*', addCacheHeaders);
  router.get('/_/pwa/manifest.webmanifest', webManifestMiddleware());

  router.use(helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    originAgentCluster: false,
  }));
  router.use(csp());
  router.use(cookieParser());
  router.use(json({
    type: ['json', 'application/csp-report'],
  }));
  router.post('/_/report/security/csp-violation', cspViolation);
  router.post('/_/report/errors', clientErrorLogger);
  router.get('**/*.(json|js|css|map)', (req, res) => res.sendStatus(404));

  router.get('/_/pwa/shell', offlineMiddleware(oneApp));
  // router.get(
  //   '*',
  //   addFrameOptionsHeader,
  //   createRequestStore(oneApp),
  //   createRequestHtmlFragment(oneApp),
  //   conditionallyAllowCors,
  //   checkStateForRedirect,
  //   checkStateForStatusCode,
  //   sendHtml
  // );

  if (enablePostToModuleRoutes) {
    router.options(
      '*',
      addSecurityHeaders,
      json({ limit: '0kb' }), // there should be no body
      urlencoded({ limit: '0kb' }), // there should be no body
      cors({ origin: false }) // disable CORS
    );

    router.post(
      '*',
      addSecurityHeaders,
      json({ limit: process.env.ONE_MAX_POST_REQUEST_PAYLOAD }),
      urlencoded({ limit: process.env.ONE_MAX_POST_REQUEST_PAYLOAD }),
      addFrameOptionsHeader,
      createRequestStore(oneApp, { useBodyForBuildingTheInitialState: true }),
      createRequestHtmlFragment(oneApp),
      conditionallyAllowCors,
      checkStateForRedirect,
      checkStateForStatusCode,
      sendHtml
    );
  }

  return router;
};

export async function createApp(opts = {}) {
  const fastify = Fastify({
    frameworkErrors: function (error, request, reply) {
      const { method, url } = request;
      const correlationId = request.headers && request.headers['correlation-id'];
      
      console.error(`Fastify internal error: method ${method}, url "${url}", correlationId "${correlationId}"`, error);
      
      return renderStaticErrorPage(reply);
    },
    ...opts
  });

  await fastify.register(ensureCorrelationId);
  // await fastify.register(logging); // TODO: Fastify Plugin is in https://github.com/americanexpress/one-app/pull/803
  await fastify.register(compress, {
    zlibOptions:{
      level: 1,
    },
  });
  await fastify.register(addSecurityHeadersPlugin);
  await fastify.register(setAppVersionHeader);
  await fastify.register(forwardedHeaderParser);

  // Note: Express runs on `onRequest` hook by default.
  //       When a route is match then all other Fastify
  //       hooks are ignored since the `done` fn from fastify
  //       moves to Express as the `next` fn.
  await fastify.register(fastifyExpress);

  fastify.express.disable('x-powered-by');
  fastify.express.disable('e-tag');

  fastify.use(makeExpressRouter());

  // Note: the following only gets executed if the request
  //       does not match any Express route

  await fastify.register(fastifyCookie);
  await fastify.register(reactHtml)

  fastify.get('/*', (_request, reply) => reply.sendHtml())

  fastify.setNotFoundHandler(async (_request, reply) => {
    reply.send('Not found')
  });

  fastify.setErrorHandler(async (error, request, reply) => {
    const { method, url } = request;
    const correlationId = request.headers && request.headers['correlation-id'];
    const headersSent = !!reply.raw.headersSent;

    console.error(`Fastify application error: method ${method}, url "${url}", correlationId "${correlationId}", headersSent: ${headersSent}`, error);

    return renderStaticErrorPage(res);
  })

  await fastify.ready();

  return fastify;
}

export default createApp;
