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

import bytes from 'bytes';
import compress from '@fastify/compress';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyFormbody from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import fastifyHelmet from '@fastify/helmet';
import fastifySensible from '@fastify/sensible';
import fastifyMetrics from 'fastify-metrics';

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

const nodeEnvIsDevelopment = () => process.env.NODE_ENV === 'development';

/**
 * Creates a Fastify app with built-in routes and configuration
 * @param {import('fastify').FastifyHttp2Options} opts Fastify app options
 * @returns {import('fastify').FastifyInstance}
 */
export async function createApp(opts = {}) {
  const enablePostToModuleRoutes = process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES === 'true';
  const fastify = Fastify({
    frameworkErrors: function frameworkErrors(error, request, reply) {
      const { method, url, headers } = request;
      const correlationId = headers['correlation-id'];

      console.error(`Fastify internal error: method ${method}, url "${url}", correlationId "${correlationId}"`, error);

      return renderStaticErrorPage(request, reply);
    },
    bodyLimit: bytes(process.env.ONE_MAX_POST_REQUEST_PAYLOAD || '10mb'), // Note: this applies to all routes
    ...opts,
  });

  fastify.register(fastifySensible);
  fastify.register(ensureCorrelationId);
  fastify.register(fastifyCookie);
  fastify.register(logging);
  fastify.register(fastifyMetrics, {
    defaultMetrics: { enabled: false },
    endpoint: null,
  });

  fastify.register(compress, {
    zlibOptions: {
      level: 1,
    },
    encodings: ['gzip'],
  });
  fastify.register(fastifyFormbody);

  fastify.register(addSecurityHeadersPlugin, {
    matchGetRoutes: [
      '/_/status',
      '/_/pwa/service-worker.js',
      '/_/pwa/manifest.webmanifest',
    ],
  });
  fastify.register(setAppVersionHeader);
  fastify.register(forwardedHeaderParser);
  // Static routes
  fastify.register((instance, _opts, done) => {
    instance.register(fastifyStatic, {
      root: path.join(__dirname, '../../build'),
      prefix: '/_/static',
      maxAge: '182d',
    });
    instance.get('/_/status', (_request, reply) => reply.status(200).send('OK'));
    instance.get('/_/pwa/service-worker.js', serviceWorkerHandler);

    done();
  });

  fastify.addContentTypeParser('application/csp-report', { parseAs: 'string' }, (req, body, doneParsing) => {
    doneParsing(null, body);
  });

  // pwa manifest & Report routes for csp and errors
  fastify.register((instance, _opts, done) => {
    instance.register(addCacheHeaders);
    instance.register(csp);
    instance.get('/_/pwa/manifest.webmanifest', webManifestMiddleware);

    if (nodeEnvIsDevelopment()) {
      instance.post('/_/report/security/csp-violation', (request, reply) => {
        const violation = request.body && JSON.parse(request.body)['csp-report'];
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
        const violation = request.body ? request.body : 'No data received!';
        console.warn(`CSP Violation: ${violation}`);
        reply.status(204).send();
      });
    }

    instance.post('/_/report/errors', (request, reply) => {
      if (!nodeEnvIsDevelopment()) {
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

  // Render
  fastify.register((instance, _opts, done) => {
    instance.register(addCacheHeaders);
    instance.register(csp);
    instance.register(
      fastifyHelmet,
      {
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false,
        originAgentCluster: false,
        contentSecurityPolicy: false,
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
    const correlationId = request.headers['correlation-id'];
    const headersSent = !!reply.raw.headersSent;

    console.error(`Fastify application error: method ${method}, url "${url}", correlationId "${correlationId}", headersSent: ${headersSent}`, error);

    return renderStaticErrorPage(request, reply);
  });

  await fastify.ready();

  return fastify;
}

export default createApp;
