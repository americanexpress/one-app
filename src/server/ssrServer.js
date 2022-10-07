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
import ms from 'ms';
import express from 'express';
import compress from '@fastify/compress';
import { json } from 'body-parser';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyFormbody from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import fastifyHelmet from '@fastify/helmet';
import fastifySensible from '@fastify/sensible';

import ensureCorrelationId from './plugins/ensureCorrelationId';
import setAppVersionHeader from './plugins/setAppVersionHeader';
import addSecurityHeadersPlugin from './plugins/addSecurityHeaders';
import csp from './plugins/csp';
import logging from './utils/logging/fastifyPlugin';
import forwardedHeaderParser from './plugins/forwardedHeaderParser';
import renderHtml from './plugins/reactHtml';
import renderStaticErrorPage from './plugins/reactHtml/staticErrorPage';
import addFrameOptionsHeader from './plugins/addFrameOptionsHeader';
import addCacheHeaders from './plugins/addCacheHeaders';
import { getServerPWAConfig, serviceWorkerHandler, webManifestMiddleware } from './pwa';

const nodeEnvIsDevelopment = process.env.NODE_ENV === 'development';

export const makeExpressRouter = (router = express.Router()) => {
  // router.use('/_/static', express.static(path.join(__dirname, '../../build'), { maxage: '182d' }));
  // router.get('/_/status', (_req, res) => res.sendStatus(200));
  // router.get('/_/pwa/service-worker.js', serviceWorkerMiddleware());
  // router.get('*', addCacheHeaders);
  // router.get('/_/pwa/manifest.webmanifest', webManifestMiddleware());

  // router.use(helmet({
  //   crossOriginEmbedderPolicy: false,
  //   crossOriginOpenerPolicy: false,
  //   crossOriginResourcePolicy: false,
  //   originAgentCluster: false,
  // }));
  // router.use(csp());
  router.use(json({
    type: ['json', 'application/csp-report'],
  }));
  // router.post('/_/report/security/csp-violation', cspViolation);
  // router.post('/_/report/errors', clientErrorLogger);
  router.get('**/*.(json|js|css|map)', (_req, res) => res.sendStatus(404));

  return router;
};

const getBodyLimit = () => {
  const customLimit = process.env.ONE_MAX_POST_REQUEST_PAYLOAD;

  if (customLimit) {
    if (typeof customLimit === 'string') {
      return ms(customLimit);
    }

    return customLimit;
  }

  return ms('10mb');
};

export async function createApp(opts = {}) {
  const enablePostToModuleRoutes = process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES === 'true';
  const fastify = Fastify({
    frameworkErrors: function frameworkErrors(error, request, reply) {
      const { method, url } = request;
      const correlationId = request.headers && request.headers['correlation-id'];

      console.error(`Fastify internal error: method ${method}, url "${url}", correlationId "${correlationId}"`, error);

      return renderStaticErrorPage(request, reply);
    },
    bodyLimit: getBodyLimit(), // Note: this applies to all routes
    ...opts,
  });

  fastify.register(fastifySensible);
  fastify.register(ensureCorrelationId);
  fastify.register(logging);
  fastify.register(compress, {
    zlibOptions: {
      level: 1,
    },
  });
  fastify.register(fastifyFormbody);

  fastify.register(addSecurityHeadersPlugin, {
    ignoreRoutes: [
      '/_/report/security/csp-violation',
      '/_/report/errors',
    ],
  });
  fastify.register(setAppVersionHeader);
  fastify.register(forwardedHeaderParser);

  fastify.register((instance, _opts, done) => {
    fastify.register(fastifyStatic, {
      root: path.join(__dirname, '../../build'),
      prefix: '/_/static',
      maxAge: '182d',
    });
    instance.get('/_/status', (_request, reply) => reply.status(200).send('OK'));
    instance.get('/_/pwa/service-worker.js', serviceWorkerHandler);

    done();
  });

  fastify.register((instance, _opts, done) => {
    fastify.register(fastifyCookie);
    fastify.register(addCacheHeaders);
    fastify.register(csp);

    instance.get('/_/pwa/manifest.webmanifest', webManifestMiddleware);

    if (nodeEnvIsDevelopment) {
      instance.post('/_/report/security/csp-violation', (request, reply) => {
        const violation = request.body && request.body['csp-report'];
        if (!violation) {
          console.warn('CSP Violation reported, but no data received');
        } else {
          const {
            'document-uri': documentUri,
            'violated-directive': violatedDirective,
            'blocked-uri': blockedUri,
            'line-number': lineNumber,
            'column-number': columnNumber,
            'source-file': sourceFile,
          } = violation;
          console.warn(`CSP Violation: ${sourceFile}:${lineNumber}:${columnNumber} on page ${documentUri} violated the ${violatedDirective} policy via ${blockedUri}`);
        }

        reply.status(204).send();
      });
    } else {
      instance.post('/_/report/security/csp-violation', (request, reply) => {
        const violation = request.body ? JSON.stringify(request.body, null, 2) : 'No data received!';
        console.warn(`CSP Violation: ${violation}`);
        reply.status(204).send();
      });
    }

    instance.post('/_/report/errors', (request, reply) => {
      if (!nodeEnvIsDevelopment) {
        const contentType = request.headers['content-type'];

        if (!/^application\/json/i.test(contentType)) {
          return reply.status(415).send('Unsupported Media Type');
        }

        const {
          body: errorsReported,
          headers: {
            'correlation-id': correlationId,
            'user-agent': userAgent,
          },
        } = request;

        if (Array.isArray(errorsReported)) {
          errorsReported.forEach((raw) => {
            if (!raw || typeof raw !== 'object') {
              // drop on the floor, this is the wrong interface
              console.warn(`dropping an error report, wrong interface (${typeof raw})`);
              return;
            }
            const {
              msg, stack, href, otherData,
            } = raw;
            const err = new Error(msg);
            Object.assign(err, {
              name: 'ClientReportedError',
              stack,
              userAgent,
              uri: href,
              metaData: {
                ...otherData,
                correlationId,
              },
            });
            console.error(err);
          });
        } else {
          // drop on the floor, this is the wrong interface
          console.warn(`dropping an error report group, wrong interface (${typeof errorsReported})`);
        }
      }

      return reply.status(204).send();
    });

    done();
  });

  fastify.register((instance, _opts, done) => {
    if (enablePostToModuleRoutes) {
      // TODO: Replicate the following
      // router.options(
      //   '*',
      //   addSecurityHeaders,
      //   json({ limit: '0kb' }), // there should be no body
      //   urlencoded({ limit: '0kb' }), // there should be no body
      //   cors({ origin: false }) // disable CORS
      // );
      instance.options('/*', (_request, reply) => {
        // reply.sendHtml();
        reply.send();
      });
    }

    done();
  });

  fastify.register((instance, _opts, done) => {
    fastify.register(fastifyCookie);
    fastify.register(addCacheHeaders);
    fastify.register(csp);

    instance.register(
      fastifyHelmet,
      {
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false,
        originAgentCluster: false,
      }
    );
    instance.register(addFrameOptionsHeader);
    instance.register(renderHtml);

    instance.get('/_/pwa/shell', (_request, reply) => {
      if (getServerPWAConfig().serviceWorker) {
        reply.sendHtml();
      } else {
        reply.status(404).send('Not found');
      }
    });

    instance.get('/*', (_request, reply) => {
      reply.sendHtml();
    });

    if (enablePostToModuleRoutes) {
      instance.post('/*', (_request, reply) => {
        reply.sendHtml();
      });
    }

    done();
  });

  fastify.setNotFoundHandler(async (_request, reply) => {
    reply.code(404).send('Not found');
  });

  fastify.setErrorHandler(async (error, request, reply) => {
    const { method, url } = request;
    const correlationId = request.headers && request.headers['correlation-id'];
    const headersSent = !!reply.raw.headersSent;

    console.error(`Fastify application error: method ${method}, url "${url}", correlationId "${correlationId}", headersSent: ${headersSent}`, error);

    return renderStaticErrorPage(request, reply);
  });

  await fastify.ready();

  return fastify;
}

export default createApp;
