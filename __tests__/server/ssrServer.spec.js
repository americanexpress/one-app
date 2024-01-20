/*
 * Copyright 2022 American Express Travel Related Services Company, Inc.
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

import util from 'node:util';
import path from 'path';
import compress from '@fastify/compress';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyFormbody from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import fastifyHelmet from '@fastify/helmet';
import fastifySensible from '@fastify/sensible';
import fastifyMetrics from 'fastify-metrics';

import openTelemetryPlugin from '@autotelic/fastify-opentelemetry';
import ensureCorrelationId from '../../src/server/plugins/ensureCorrelationId';
import setAppVersionHeader from '../../src/server/plugins/setAppVersionHeader';
import addSecurityHeadersPlugin from '../../src/server/plugins/addSecurityHeaders';
import csp from '../../src/server/plugins/csp';
import logging from '../../src/server/utils/logging/fastifyPlugin';
import logger from '../../src/server/utils/logging/logger';
import forwardedHeaderParser from '../../src/server/plugins/forwardedHeaderParser';
import renderHtml from '../../src/server/plugins/reactHtml';
import renderStaticErrorPage from '../../src/server/plugins/reactHtml/staticErrorPage';
import addFrameOptionsHeader from '../../src/server/plugins/addFrameOptionsHeader';
import addCacheHeaders from '../../src/server/plugins/addCacheHeaders';
import {
  // eslint-disable-next-line import/named
  _setConfig,
  serviceWorkerHandler,
  webManifestMiddleware,
} from '../../src/server/pwa';
import noopTracer from '../../src/server/plugins/noopTracer';

import ssrServer from '../../src/server/ssrServer';

const { NODE_ENV } = process.env;

jest.mock('@fastify/compress');
jest.mock('fastify');
jest.mock('@fastify/cookie');
jest.mock('@fastify/formbody');
jest.mock('@fastify/static');
jest.mock('@fastify/helmet');
jest.mock('@fastify/sensible');
jest.mock('fastify-metrics');
jest.mock('pino');

jest.mock('../../src/server/plugins/ensureCorrelationId');
jest.mock('../../src/server/plugins/setAppVersionHeader');
jest.mock('../../src/server/plugins/addSecurityHeaders');
jest.mock('../../src/server/plugins/csp');
jest.mock('../../src/server/utils/logging/logger');
jest.mock('../../src/server/utils/logging/fastifyPlugin');
jest.mock('../../src/server/plugins/forwardedHeaderParser');
jest.mock('../../src/server/plugins/reactHtml');
jest.mock('../../src/server/plugins/reactHtml/staticErrorPage');
jest.mock('../../src/server/plugins/addFrameOptionsHeader');
jest.mock('../../src/server/plugins/addCacheHeaders');
jest.mock('../../src/server/pwa', () => {
  let config = null;

  return {
    _setConfig: (newConfig) => {
      config = newConfig;
    },
    getServerPWAConfig: () => config,
    serviceWorkerHandler: jest.fn(),
    webManifestMiddleware: jest.fn(),
  };
});

afterAll(() => {
  process.env.NODE_ENV = NODE_ENV;
});

describe('ssrServer', () => {
  const mockFastifyInstance = {
    register: jest.fn(async (plugin) => {
      plugin(mockFastifyInstance, {}, jest.fn());
    }),
    setNotFoundHandler: jest.fn(),
    setErrorHandler: jest.fn(),
    ready: jest.fn(),
    addContentTypeParser: jest.fn(),
    decorateRequest: jest.fn(),
    addHook: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
  };
  const {
    setNotFoundHandler,
    setErrorHandler,
    ready,
    get,
    post,
    register,
  } = mockFastifyInstance;

  Fastify.mockImplementation(() => mockFastifyInstance);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
    delete process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES;
    delete process.env.ONE_MAX_POST_REQUEST_PAYLOAD;
    delete process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  });

  test('builds the fastify server and registers plugins in the correct order', async () => {
    const app = await ssrServer();

    expect(Fastify).toHaveBeenCalledWith({
      frameworkErrors: expect.any(Function),
      bodyLimit: 10485760,
      logger,
      disableRequestLogging: true,
    });

    expect(register).toHaveBeenCalledTimes(23);
    expect(register.mock.calls[1][0]).toEqual(noopTracer);
    expect(register.mock.calls[2][0]).toEqual(fastifySensible);
    expect(register.mock.calls[3][0]).toEqual(ensureCorrelationId);
    expect(register.mock.calls[4][0]).toEqual(fastifyCookie);
    expect(register.mock.calls[5][0]).toEqual(logging);
    expect(register.mock.calls[6][0]).toEqual(fastifyMetrics);
    expect(register.mock.calls[7]).toEqual([
      compress,
      {
        zlibOptions: {
          level: 1,
        },
        encodings: ['gzip'],
      },
    ]);
    expect(register.mock.calls[8][0]).toEqual(fastifyFormbody);
    expect(register.mock.calls[9]).toEqual([
      addSecurityHeadersPlugin,
      {
        matchGetRoutes: ['/_/status', '/_/pwa/service-worker.js', '/_/pwa/manifest.webmanifest'],
      },
    ]);
    expect(register.mock.calls[10][0]).toEqual(setAppVersionHeader);
    expect(register.mock.calls[11][0]).toEqual(forwardedHeaderParser);
    expect(register.mock.calls[12][0]).toEqual(expect.any(Function));
    expect(register.mock.calls[13]).toEqual([
      fastifyStatic,
      {
        root: path.join(__dirname, '../../build'),
        prefix: '/_/static',
        maxAge: '182d',
      },
    ]);
    expect(register.mock.calls[14][0]).toEqual(expect.any(Function)); // abstraction
    expect(register.mock.calls[15][0]).toEqual(addCacheHeaders);
    expect(register.mock.calls[16][0]).toEqual(csp);
    expect(register.mock.calls[18][0]).toEqual(addCacheHeaders);
    expect(register.mock.calls[19][0]).toEqual(csp);
    expect(register.mock.calls[20]).toEqual([
      fastifyHelmet,
      {
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false,
        originAgentCluster: false,
        contentSecurityPolicy: false,
      },
    ]);
    expect(register.mock.calls[20][0]).toEqual(fastifyHelmet);
    expect(register.mock.calls[21][0]).toEqual(addFrameOptionsHeader);
    expect(register.mock.calls[22][0]).toEqual(renderHtml);

    expect(setNotFoundHandler).toHaveBeenCalledTimes(1);
    expect(setErrorHandler).toHaveBeenCalledTimes(1);
    expect(ready).toHaveBeenCalledTimes(1);

    expect(app).not.toBe(undefined);
  });

  it('uses the OpenTelemetry plugin when OTel tracing is enabled', async () => {
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = 'http://localhost:4317/v1/traces';
    await ssrServer();

    expect(Fastify).toHaveBeenCalledWith({
      frameworkErrors: expect.any(Function),
      bodyLimit: 10485760,
      logger,
      disableRequestLogging: true,
    });

    expect(register).toHaveBeenCalledTimes(23);
    expect(register.mock.calls[1][0]).toEqual(openTelemetryPlugin);
  });

  test('frameworkErrors reports and renders error', async () => {
    await ssrServer();
    const { frameworkErrors } = Fastify.mock.calls[0][0];

    const error = new Error('testing');
    delete error.stack;
    const request = {
      log: { error: jest.fn() },
      method: 'get',
      url: 'example.com',
      headers: {},
    };
    const reply = {};

    frameworkErrors(error, request, reply);

    expect(util.format(...request.log.error.mock.calls[0])).toMatchInlineSnapshot(
      '"Fastify internal error: method get, url "example.com", correlationId "undefined" [Error: testing]"'
    );
    expect(renderStaticErrorPage).toHaveBeenCalled();
  });

  describe('static routes', () => {
    test('/_/status responds with 200', async () => {
      await ssrServer();
      const reply = {
        status: jest.fn(() => reply),
        send: jest.fn(() => reply),
      };

      get.mock.calls[0][1](null, reply);

      expect(get.mock.calls[0][0]).toEqual('/_/status');
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith('OK');
    });

    test('/_/pwa/service-worker.js uses the serviceWorkerHandler handler', async () => {
      await ssrServer();

      const reply = {
        status: jest.fn(() => reply),
        send: jest.fn(() => reply),
      };

      expect(get.mock.calls[1][0]).toEqual('/_/pwa/service-worker.js');
      expect(get.mock.calls[1][1]).toEqual(serviceWorkerHandler);
    });
  });

  describe('pwa routes', () => {
    test('/_/pwa/manifest.webmanifest uses the webManifestMiddleware handler', async () => {
      await ssrServer();

      const reply = {
        status: jest.fn(() => reply),
        send: jest.fn(() => reply),
      };

      expect(get.mock.calls[2][0]).toEqual('/_/pwa/manifest.webmanifest');
      expect(get.mock.calls[2][1]).toEqual(webManifestMiddleware);
    });

    describe('DEVELOPMENT', () => {
      describe('empty body', () => {
        test('/_/report/security/csp-violation report with no data', async () => {
          await ssrServer();

          const request = {
            log: { warn: jest.fn() },
          };
          const reply = {
            status: jest.fn(() => reply),
            send: jest.fn(() => reply),
          };

          post.mock.calls[0][1](request, reply);

          expect(post.mock.calls[0][0]).toEqual('/_/report/security/csp-violation');
          expect(request.log.warn).toHaveBeenCalledWith(
            'CSP Violation reported, but no data received'
          );
          expect(reply.status).toHaveBeenCalledWith(204);
          expect(reply.send).toHaveBeenCalled();
        });
      });

      describe('missing csp-report', () => {
        test('/_/report/security/csp-violation report with no data', async () => {
          await ssrServer();

          const request = {
            headers: {
              'Content-Type': 'application/csp-report',
            },
            body: JSON.stringify({}),
            log: { warn: jest.fn() },
          };
          const reply = {
            status: jest.fn(() => reply),
            send: jest.fn(() => reply),
          };

          post.mock.calls[0][1](request, reply);

          expect(post.mock.calls[0][0]).toEqual('/_/report/security/csp-violation');
          expect(request.log.warn).toHaveBeenCalledWith(
            'CSP Violation reported, but no data received'
          );
          expect(reply.status).toHaveBeenCalledWith(204);
          expect(reply.send).toHaveBeenCalled();
        });
      });

      test('/_/report/security/csp-violation reports data', async () => {
        await ssrServer();

        const request = {
          body: JSON.stringify({
            'csp-report': {
              'document-uri': 'document-uri',
              'violated-directive': 'violated-directive',
              'blocked-uri': 'blocked-uri',
              'line-number': 'line-number',
              'column-number': 'column-number',
              'source-file': 'source-file',
            },
          }),
          log: { warn: jest.fn(util.format) },
        };
        const reply = {
          status: jest.fn(() => reply),
          send: jest.fn(() => reply),
        };

        post.mock.calls[0][1](request, reply);

        expect(post.mock.calls[0][0]).toEqual('/_/report/security/csp-violation');
        expect(request.log.warn.mock.results[0].value).toMatchInlineSnapshot(
          '"CSP Violation: source-file:line-number:column-number on page document-uri violated the violated-directive policy via blocked-uri"'
        );
        expect(reply.status).toHaveBeenCalledWith(204);
        expect(reply.send).toHaveBeenCalled();
      });

      test('/_/report/errors responds with 204', async () => {
        await ssrServer();

        const request = {
          log: {
            warn: jest.fn(),
            error: jest.fn(),
          },
        };
        const reply = {
          status: jest.fn(() => reply),
          send: jest.fn(() => reply),
        };

        post.mock.calls[1][1](request, reply);

        expect(post.mock.calls[1][0]).toEqual('/_/report/errors');
        expect(request.log.warn).not.toHaveBeenCalled();
        expect(request.log.error).not.toHaveBeenCalled();
        expect(reply.status).toHaveBeenCalledWith(204);
        expect(reply.send).toHaveBeenCalled();
      });
    });

    describe('PRODUCTION', () => {
      describe('empty body', () => {
        test('/_/report/security/csp-violation report with no data', async () => {
          process.env.NODE_ENV = 'production';
          await ssrServer();

          const request = {
            headers: {},
            log: { warn: jest.fn(util.format) },
          };
          const reply = {
            status: jest.fn(() => reply),
            send: jest.fn(() => reply),
          };

          post.mock.calls[0][1](request, reply);

          expect(post.mock.calls[0][0]).toEqual('/_/report/security/csp-violation');
          expect(request.log.warn.mock.results[0].value).toMatchInlineSnapshot(
            '"CSP Violation: No data received!"'
          );
          expect(reply.status).toHaveBeenCalledWith(204);
          expect(reply.send).toHaveBeenCalled();
        });
      });

      describe('data in body', () => {
        test('/_/report/security/csp-violation report with no data', async () => {
          process.env.NODE_ENV = 'production';
          await ssrServer();

          const request = {
            headers: {},
            body: JSON.stringify({
              unit: 'testing',
            }),
            log: { warn: jest.fn(util.format) },
          };
          const reply = {
            status: jest.fn(() => reply),
            send: jest.fn(() => reply),
          };

          post.mock.calls[0][1](request, reply);

          expect(post.mock.calls[0][0]).toEqual('/_/report/security/csp-violation');
          expect(request.log.warn.mock.results[0].value).toMatchInlineSnapshot(
            '"CSP Violation: {"unit":"testing"}"'
          );
          expect(reply.status).toHaveBeenCalledWith(204);
          expect(reply.send).toHaveBeenCalled();
        });
      });

      test('/_/report/errors responds with 415', async () => {
        process.env.NODE_ENV = 'production';

        await ssrServer();

        const request = {
          headers: {
            'content-type': 'text/plain',
          },
          log: {
            warn: jest.fn(),
            error: jest.fn(),
          },
        };
        const reply = {
          status: jest.fn(() => reply),
          send: jest.fn(() => reply),
        };

        post.mock.calls[1][1](request, reply);

        expect(post.mock.calls[1][0]).toEqual('/_/report/errors');
        expect(request.log.warn).not.toHaveBeenCalled();
        expect(request.log.error).not.toHaveBeenCalled();
        expect(reply.status).toHaveBeenCalledWith(415);
        expect(reply.send).toHaveBeenCalledWith('Unsupported Media Type');
      });

      test('/_/report/errors invalid body type', async () => {
        process.env.NODE_ENV = 'production';

        await ssrServer();

        const request = {
          headers: {
            'content-type': 'application/json',
            'correlation-id': 'correlationId',
            'user-agent': 'userAgent',
          },
          body: 'invalid',
          log: {
            warn: jest.fn(util.format),
            error: jest.fn(util.format),
          },
        };
        const reply = {
          status: jest.fn(() => reply),
          send: jest.fn(() => reply),
        };

        post.mock.calls[1][1](request, reply);

        expect(post.mock.calls[1][0]).toEqual('/_/report/errors');
        expect(request.log.warn.mock.results[0].value).toMatchInlineSnapshot(
          '"dropping an error report group, wrong interface (string)"'
        );
        expect(request.log.error).not.toHaveBeenCalled();
        expect(reply.status).toHaveBeenCalledWith(204);
        expect(reply.send).toHaveBeenCalled();
      });

      test('/_/report/errors invalid report items are ignored', async () => {
        process.env.NODE_ENV = 'production';

        await ssrServer();

        const request = {
          headers: {
            'content-type': 'application/json',
            'correlation-id': 'correlationId',
            'user-agent': 'userAgent',
          },
          body: ['', false, 'not an object'],
          log: {
            warn: jest.fn(util.format),
            error: jest.fn(util.format),
          },
        };
        const reply = {
          status: jest.fn(() => reply),
          send: jest.fn(() => reply),
        };

        post.mock.calls[1][1](request, reply);

        expect(post.mock.calls[1][0]).toEqual('/_/report/errors');
        expect(request.log.warn.mock.results[0].value).toMatchInlineSnapshot(
          '"dropping an error report, wrong interface (string)"'
        );
        expect(request.log.warn.mock.results[1].value).toMatchInlineSnapshot(
          '"dropping an error report, wrong interface (boolean)"'
        );
        expect(request.log.warn.mock.results[2].value).toMatchInlineSnapshot(
          '"dropping an error report, wrong interface (string)"'
        );
        expect(request.log.error).not.toHaveBeenCalled();
        expect(reply.status).toHaveBeenCalledWith(204);
        expect(reply.send).toHaveBeenCalled();
      });

      test('/_/report/errors reports errors', async () => {
        process.env.NODE_ENV = 'production';

        await ssrServer();

        const request = {
          headers: {
            'content-type': 'application/json',
            'correlation-id': 'correlationId',
            'user-agent': 'userAgent',
          },
          body: [
            {
              msg: 'testing',
              stack: 'stack',
              href: 'href',
              otherData: {
                testing: true,
              },
            },
          ],
          log: {
            warn: jest.fn(),
            error: jest.fn(),
          },
        };
        const reply = {
          status: jest.fn(() => reply),
          send: jest.fn(() => reply),
        };

        post.mock.calls[1][1](request, reply);

        expect(post.mock.calls[1][0]).toEqual('/_/report/errors');
        expect(request.log.warn).not.toHaveBeenCalled();
        expect(request.log.error.mock.calls.length).toBe(1);
        expect(request.log.error.mock.calls[0][0] instanceof Error).toBe(true);
        expect(request.log.error.mock.calls[0][0].name).toBe('ClientReportedError');
        expect(request.log.error.mock.calls[0][0].stack).toBe('stack');
        expect(request.log.error.mock.calls[0][0].userAgent).toBe('userAgent');
        expect(request.log.error.mock.calls[0][0].uri).toBe('href');
        expect(request.log.error.mock.calls[0][0].metaData).toEqual({
          correlationId: 'correlationId',
          testing: true,
        });
        expect(reply.status).toHaveBeenCalledWith(204);
        expect(reply.send).toHaveBeenCalled();
      });
    });

    describe('render html', () => {
      test('/_/pwa/shell responds with html', async () => {
        _setConfig({
          serviceWorker: true,
        });

        await ssrServer();

        const reply = {
          sendHtml: jest.fn(() => reply),
        };

        get.mock.calls[3][1](null, reply);

        expect(get.mock.calls[3][0]).toEqual('/_/pwa/shell');
        expect(reply.sendHtml).toHaveBeenCalled();
      });

      test('/_/pwa/shell responds with 404', async () => {
        _setConfig({
          serviceWorker: false,
        });

        await ssrServer();

        const reply = {
          status: jest.fn(() => reply),
          send: jest.fn(() => reply),
        };

        get.mock.calls[3][1](null, reply);

        expect(get.mock.calls[3][0]).toEqual('/_/pwa/shell');
        expect(reply.status).toHaveBeenCalledWith(404);
        expect(reply.send).toHaveBeenCalledWith('Not found');
      });

      test('any other GET route renders html', async () => {
        await ssrServer();

        const reply = {
          sendHtml: jest.fn(() => reply),
        };

        get.mock.calls[4][1](null, reply);

        expect(get.mock.calls[4][0]).toEqual('/*');
        expect(reply.sendHtml).toHaveBeenCalled();
      });

      test('any other POST route renders html is disabled', async () => {
        await ssrServer();

        expect(post).toHaveBeenCalledTimes(2);
        expect(post.mock.calls[0][0]).toEqual('/_/report/security/csp-violation');
        expect(post.mock.calls[1][0]).toEqual('/_/report/errors');
      });

      test('any other POST route renders html', async () => {
        process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES = 'true';

        await ssrServer();

        const reply = {
          sendHtml: jest.fn(() => reply),
        };

        post.mock.calls[2][1](null, reply);

        expect(post).toHaveBeenCalledTimes(3);
        expect(post.mock.calls[2][0]).toEqual('/*');
        expect(reply.sendHtml).toHaveBeenCalled();
      });
    });

    test('setNotFoundHandler responds with 404', async () => {
      _setConfig({
        serviceWorker: false,
      });

      await ssrServer();

      const reply = {
        code: jest.fn(() => reply),
        send: jest.fn(() => reply),
      };

      await setNotFoundHandler.mock.calls[0][0](null, reply);

      expect(reply.code).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith('Not found');
    });

    test('setErrorHandler logs an error and renders the static error page', async () => {
      _setConfig({
        serviceWorker: false,
      });

      await ssrServer();

      const error = new Error('testing');
      delete error.stack;
      const request = {
        method: 'get',
        url: '/example',
        headers: {},
        log: { error: jest.fn(util.format) },
      };
      const reply = {
        code: jest.fn(() => reply),
        send: jest.fn(() => reply),
        raw: {},
      };

      await setErrorHandler.mock.calls[0][0](error, request, reply);

      expect(request.log.error.mock.results[0].value).toMatchInlineSnapshot(
        '"Fastify application error: method get, url "/example", correlationId "undefined", headersSent: false [Error: testing]"'
      );
      expect(renderStaticErrorPage).toHaveBeenCalledWith(request, reply);
    });

    test('setErrorHandler logs an error and renders the static error page with "headersSent" and "correlationId"', async () => {
      _setConfig({
        serviceWorker: false,
      });

      await ssrServer();

      const error = new Error('testing');
      delete error.stack;
      const request = {
        log: { error: jest.fn(util.format) },
        method: 'get',
        url: '/example',
        headers: {
          'correlation-id': 123,
        },
      };
      const reply = {
        code: jest.fn(() => reply),
        send: jest.fn(() => reply),
        raw: {
          headersSent: 'asd',
        },
      };

      await setErrorHandler.mock.calls[0][0](error, request, reply);

      expect(request.log.error.mock.results[0].value).toMatchInlineSnapshot(
        '"Fastify application error: method get, url "/example", correlationId "123", headersSent: true [Error: testing]"'
      );
      expect(renderStaticErrorPage).toHaveBeenCalledWith(request, reply);
    });
  });
});
