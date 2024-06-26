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

import path from 'node:path';

import { argv } from 'yargs';
import bytes from 'bytes';
import compress from '@fastify/compress';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyFormbody from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import fastifyHelmet from '@fastify/helmet';
import fastifySensible from '@fastify/sensible';
import fastifyOpenTelemetry from '@autotelic/fastify-opentelemetry';
import fastifyMetrics from 'fastify-metrics';
import client from 'prom-client';

import ensureCorrelationId from './plugins/ensureCorrelationId';
import setAppVersionHeader from './plugins/setAppVersionHeader';
import addSecurityHeadersPlugin from './plugins/addSecurityHeaders';
import csp from './plugins/csp';
import requestLogging from './plugins/requestLogging';
import requestRaw from './plugins/requestRaw';
import forwardedHeaderParser from './plugins/forwardedHeaderParser';
import renderHtml from './plugins/reactHtml';
import renderStaticErrorPage from './plugins/reactHtml/staticErrorPage';
import addFrameOptionsHeader from './plugins/addFrameOptionsHeader';
import addCacheHeaders from './plugins/addCacheHeaders';
import { getServerPWAConfig, serviceWorkerHandler, webManifestMiddleware } from './pwa';
import logger from './utils/logging/logger';
import noopTracer from './plugins/noopTracer';

const nodeEnvIsDevelopment = () => process.env.NODE_ENV === 'development';

/**
 * Registers all the plugins and routes for the Fastify app
 * @param {import('fastify').FastifyInstance} fastify Fastify instance
 */

async function appPlugin(fastify) {
  if (process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || argv.logLevel === 'trace') {
    fastify.register(fastifyOpenTelemetry, { wrapRoutes: true, propagateToReply: true });
  } else {
    fastify.register(noopTracer);
  }
  if (!process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || process.env.ONE_ENABLE_REQUEST_LOGGING_WHILE_TRACING === 'true') {
    fastify.register(requestLogging, { spy: true });
  }
  fastify.register(requestRaw);
  fastify.register(fastifySensible);
  fastify.register(ensureCorrelationId);
  fastify.register(fastifyCookie);
  fastify.register(fastifyMetrics, {
    defaultMetrics: { enabled: false },
    endpoint: null,
    promClient: client,
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
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../../build'),
    prefix: '/_/static',
    maxAge: '182d',
  });
  fastify.get('/_/status', (_request, reply) => reply.status(200).send('OK'));
  fastify.get('/_/pwa/service-worker.js', serviceWorkerHandler);

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
          request.log.warn('CSP Violation reported, but no data received');
        } else {
          const {
            'document-uri': documentUri,
            'violated-directive': violatedDirective,
            'blocked-uri': blockedUri,
            'line-number': lineNumber,
            'column-number': columnNumber,
            'source-file': sourceFile,
          } = violation;
          request.log.warn('CSP Violation: %s:%s:%s on page %s violated the %s policy via %s', sourceFile, lineNumber, columnNumber, documentUri, violatedDirective, blockedUri);
        }

        return reply.status(204).send();
      });
    } else {
      instance.post('/_/report/security/csp-violation', (request, reply) => {
        const violation = request.body ? request.body : 'No data received!';
        request.log.warn('CSP Violation: %s', violation);
        return reply.status(204).send();
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
              request.log.warn('dropping an error report, wrong interface (%s)', typeof raw);
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
            request.log.error(err);
          });
        } else {
          // drop on the floor, this is the wrong interface
          request.log.warn('dropping an error report group, wrong interface (%s)', typeof errorsReported);
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

    instance.get('/_/pwa/shell', async (_request, reply) => {
      if (getServerPWAConfig().serviceWorker) {
        reply.sendHtml();
      } else {
        reply.status(404).send('Not found');
      }
      return reply;
    });
    instance.get('/*', async (_request, reply) => {
      reply.sendHtml();
      return reply;
    });

    if (process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES === 'true') {
      instance.post('/*', (_request, reply) => {
        reply.sendHtml();
        return reply;
      });
    }

    done();
  });

  fastify.setNotFoundHandler(async (_request, reply) => reply.code(404).send('Not found'));
  fastify.setErrorHandler(async (error, request, reply) => {
    const { method, url } = request;
    const correlationId = request.headers['correlation-id'];
    const headersSent = !!reply.raw.headersSent;

    request.log.error('Fastify application error: method %s, url "%s", correlationId "%s", headersSent: %s', method, url, correlationId, headersSent, error);

    reply.code(500);
    renderStaticErrorPage(request, reply);
    return reply;
  });
}

/**
 * Creates a Fastify app with built-in routes and configuration
 * @param {import('fastify').FastifyHttp2Options} opts Fastify app options
 * @returns {import('fastify').FastifyInstance}
 */

export async function createApp(opts = {}) {
  const fastify = Fastify({
    logger,
    disableRequestLogging: true,
    frameworkErrors: function frameworkErrors(error, request, reply) {
      const { method, url, headers } = request;
      const correlationId = headers['correlation-id'];

      request.log.error('Fastify internal error: method %s, url "%s", correlationId "%s"', method, url, correlationId, error);

      renderStaticErrorPage(request, reply);
      return reply;
    },
    bodyLimit: bytes(process.env.ONE_MAX_POST_REQUEST_PAYLOAD || '10mb'), // Note: this applies to all routes
    ...opts,
  });

  fastify.register(appPlugin);

  await fastify.ready();

  return fastify;
}

export default createApp;
