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

import path from 'path';
import compress from '@fastify/compress';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyFormbody from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import fastifyHelmet from '@fastify/helmet';
import fastifySensible from '@fastify/sensible';

import ensureCorrelationId from '../../src/server/plugins/ensureCorrelationId';
import setAppVersionHeader from '../../src/server/plugins/setAppVersionHeader';
import addSecurityHeadersPlugin from '../../src/server/plugins/addSecurityHeaders';
import csp from '../../src/server/plugins/csp';
import logging from '../../src/server/utils/logging/fastifyPlugin';
import forwardedHeaderParser from '../../src/server/plugins/forwardedHeaderParser';
import renderHtml from '../../src/server/plugins/reactHtml';
import renderStaticErrorPage from '../../src/server/plugins/reactHtml/staticErrorPage';
import addFrameOptionsHeader from '../../src/server/plugins/addFrameOptionsHeader';
import addCacheHeaders from '../../src/server/plugins/addCacheHeaders';
import {
  // eslint-disable-next-line import/named
  _setConfig, serviceWorkerHandler, webManifestMiddleware,
} from '../../src/server/pwa';

import ssrServer from '../../src/server/ssrServer';

const { NODE_ENV } = process.env;

jest.mock('@fastify/compress');
jest.mock('fastify');
jest.mock('@fastify/cookie');
jest.mock('@fastify/formbody');
jest.mock('@fastify/static');
jest.mock('@fastify/helmet');
jest.mock('@fastify/sensible');
jest.mock('../../src/server/plugins/ensureCorrelationId');
jest.mock('../../src/server/plugins/setAppVersionHeader');
jest.mock('../../src/server/plugins/addSecurityHeaders');
jest.mock('../../src/server/plugins/csp');
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
  jest.spyOn(console, 'info').mockImplementation(() => { });
  jest.spyOn(console, 'log').mockImplementation(() => { });
  jest.spyOn(console, 'warn').mockImplementation(() => { });
  jest.spyOn(console, 'error').mockImplementation(() => { });

  let register;
  let setNotFoundHandler;
  let setErrorHandler;
  let ready;

  beforeEach(() => {
    // jest.resetModules();
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
    delete process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES;
    delete process.env.ONE_MAX_POST_REQUEST_PAYLOAD;

    register = jest.fn();
    setNotFoundHandler = jest.fn();
    setErrorHandler = jest.fn();
    ready = jest.fn();

    Fastify.mockImplementationOnce(() => ({
      register,
      setNotFoundHandler,
      setErrorHandler,
      ready,
    }));
  });

  test('builds the fastify server and registers plugins in the correct order', async () => {
    const app = await ssrServer();

    expect(Fastify).toHaveBeenCalledWith({
      frameworkErrors: expect.any(Function),
      bodyLimit: 10485760,
    });

    expect(register).toHaveBeenCalledTimes(12);
    expect(register.mock.calls[0][0]).toEqual(fastifySensible);
    expect(register.mock.calls[1][0]).toEqual(ensureCorrelationId);
    expect(register.mock.calls[2][0]).toEqual(fastifyCookie);
    expect(register.mock.calls[3][0]).toEqual(logging);
    expect(register.mock.calls[4]).toEqual([compress, {
      zlibOptions: {
        level: 1,
      },
      encodings: [
        'gzip',
      ],
    }]);
    expect(register.mock.calls[5][0]).toEqual(fastifyFormbody);
    expect(register.mock.calls[6]).toEqual([addSecurityHeadersPlugin, {
      matchGetRoutes: [
        '/_/status',
        '/_/pwa/service-worker.js',
        '/_/pwa/manifest.webmanifest',
      ],
    }]);
    expect(register.mock.calls[7][0]).toEqual(setAppVersionHeader);
    expect(register.mock.calls[8][0]).toEqual(forwardedHeaderParser);
    expect(register.mock.calls[9][0]).toEqual(expect.any(Function)); // abstraction
    expect(register.mock.calls[10][0]).toEqual(expect.any(Function)); // abstraction
    expect(register.mock.calls[11][0]).toEqual(expect.any(Function)); // abstraction

    const staticRegister = jest.fn();
    register.mock.calls[9][0]({
      register: staticRegister,
      get: jest.fn(),
    }, null, jest.fn());

    expect(staticRegister.mock.calls[0]).toEqual([
      fastifyStatic,
      {
        root: path.join(__dirname, '../../build'),
        prefix: '/_/static',
        maxAge: '182d',
      },
    ]);

    const pwaRegister = jest.fn();
    register.mock.calls[10][0]({
      register: pwaRegister,
      get: jest.fn(),
      post: jest.fn(),
    }, null, jest.fn());

    expect(pwaRegister.mock.calls[0][0]).toEqual(addCacheHeaders);
    expect(pwaRegister.mock.calls[1][0]).toEqual(csp);

    const renderRegister = jest.fn();
    register.mock.calls[11][0]({
      register: renderRegister,
      get: jest.fn(),
      post: jest.fn(),
    }, null, jest.fn());

    expect(renderRegister.mock.calls[0][0]).toEqual(addCacheHeaders);
    expect(renderRegister.mock.calls[1][0]).toEqual(csp);
    expect(renderRegister.mock.calls[2]).toEqual([
      fastifyHelmet,
      {
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false,
        originAgentCluster: false,
      },
    ]);
    expect(renderRegister.mock.calls[3][0]).toEqual(addFrameOptionsHeader);
    expect(renderRegister.mock.calls[4][0]).toEqual(renderHtml);

    expect(setNotFoundHandler).toHaveBeenCalledTimes(1);
    expect(setErrorHandler).toHaveBeenCalledTimes(1);
    expect(ready).toHaveBeenCalledTimes(1);

    expect(app).not.toBe(undefined);
  });

  test('frameworkErrors reports and renders error', async () => {
    await ssrServer();
    const { frameworkErrors } = Fastify.mock.calls[0][0];

    const error = new Error('testing');
    const request = {
      method: 'get',
      url: 'example.com',
      headers: {},
    };
    const reply = {};

    frameworkErrors(error, request, reply);

    expect(console.error).toHaveBeenCalledWith(
      'Fastify internal error: method get, url "example.com", correlationId "undefined"',
      error
    );
    expect(renderStaticErrorPage).toHaveBeenCalled();
  });

  describe('static routes', () => {
    test('/_/status responds with 200', async () => {
      await ssrServer();

      const get = jest.fn();

      register.mock.calls[9][0]({
        register: jest.fn(),
        get,
      }, null, jest.fn());

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

      const get = jest.fn();

      register.mock.calls[9][0]({
        register: jest.fn(),
        get,
      }, null, jest.fn());

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

      const get = jest.fn();

      register.mock.calls[10][0]({
        register: jest.fn(),
        get,
        post: jest.fn(),
      }, null, jest.fn());

      const reply = {
        status: jest.fn(() => reply),
        send: jest.fn(() => reply),
      };

      expect(get.mock.calls[0][0]).toEqual('/_/pwa/manifest.webmanifest');
      expect(get.mock.calls[0][1]).toEqual(webManifestMiddleware);
    });

    describe('DEVELOPMENT', () => {
      describe('empty body', () => {
        test('/_/report/security/csp-violation report with no data', async () => {
          await ssrServer();

          const post = jest.fn();

          register.mock.calls[10][0]({
            register: jest.fn(),
            get: jest.fn(),
            post,
          }, null, jest.fn());

          const request = {};
          const reply = {
            status: jest.fn(() => reply),
            send: jest.fn(() => reply),
          };

          post.mock.calls[0][1](request, reply);

          expect(post.mock.calls[0][0]).toEqual('/_/report/security/csp-violation');
          expect(console.warn).toHaveBeenCalledWith('CSP Violation reported, but no data received');
          expect(reply.status).toHaveBeenCalledWith(204);
          expect(reply.send).toHaveBeenCalled();
        });
      });

      describe('missing csp-report', () => {
        test('/_/report/security/csp-violation report with no data', async () => {
          await ssrServer();

          const post = jest.fn();

          register.mock.calls[10][0]({
            register: jest.fn(),
            get: jest.fn(),
            post,
          }, null, jest.fn());

          const request = {
            body: {},
          };
          const reply = {
            status: jest.fn(() => reply),
            send: jest.fn(() => reply),
          };

          post.mock.calls[0][1](request, reply);

          expect(post.mock.calls[0][0]).toEqual('/_/report/security/csp-violation');
          expect(console.warn).toHaveBeenCalledWith('CSP Violation reported, but no data received');
          expect(reply.status).toHaveBeenCalledWith(204);
          expect(reply.send).toHaveBeenCalled();
        });
      });

      test('/_/report/security/csp-violation reports data', async () => {
        await ssrServer();

        const post = jest.fn();

        register.mock.calls[10][0]({
          register: jest.fn(),
          get: jest.fn(),
          post,
        }, null, jest.fn());

        const request = {
          body: {
            'csp-report': {
              'document-uri': 'document-uri',
              'violated-directive': 'violated-directive',
              'blocked-uri': 'blocked-uri',
              'line-number': 'line-number',
              'column-number': 'column-number',
              'source-file': 'source-file',
            },
          },
        };
        const reply = {
          status: jest.fn(() => reply),
          send: jest.fn(() => reply),
        };

        post.mock.calls[0][1](request, reply);

        expect(post.mock.calls[0][0]).toEqual('/_/report/security/csp-violation');
        expect(console.warn).toHaveBeenCalledWith('CSP Violation: source-file:line-number:column-number on page document-uri violated the violated-directive policy via blocked-uri');
        expect(reply.status).toHaveBeenCalledWith(204);
        expect(reply.send).toHaveBeenCalled();
      });

      test('/_/report/errors responds with 204', async () => {
        await ssrServer();

        const post = jest.fn();

        register.mock.calls[10][0]({
          register: jest.fn(),
          get: jest.fn(),
          post,
        }, null, jest.fn());

        const request = {};
        const reply = {
          status: jest.fn(() => reply),
          send: jest.fn(() => reply),
        };

        post.mock.calls[1][1](request, reply);

        expect(post.mock.calls[1][0]).toEqual('/_/report/errors');
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
        expect(reply.status).toHaveBeenCalledWith(204);
        expect(reply.send).toHaveBeenCalled();
      });
    });

    describe('PRODUCTION', () => {
      describe('empty body', () => {
        test('/_/report/security/csp-violation report with no data', async () => {
          process.env.NODE_ENV = 'production';
          await ssrServer();

          const post = jest.fn();

          register.mock.calls[10][0]({
            register: jest.fn(),
            get: jest.fn(),
            post,
          }, null, jest.fn());

          const request = {
            headers: {},
          };
          const reply = {
            status: jest.fn(() => reply),
            send: jest.fn(() => reply),
          };

          post.mock.calls[0][1](request, reply);

          expect(post.mock.calls[0][0]).toEqual('/_/report/security/csp-violation');
          expect(console.warn).toHaveBeenCalledWith('CSP Violation: No data received!');
          expect(reply.status).toHaveBeenCalledWith(204);
          expect(reply.send).toHaveBeenCalled();
        });
      });

      describe('data in body', () => {
        test('/_/report/security/csp-violation report with no data', async () => {
          process.env.NODE_ENV = 'production';
          await ssrServer();

          const post = jest.fn();

          register.mock.calls[10][0]({
            register: jest.fn(),
            get: jest.fn(),
            post,
          }, null, jest.fn());

          const request = {
            headers: {},
            body: {
              unit: 'testing',
            },
          };
          const reply = {
            status: jest.fn(() => reply),
            send: jest.fn(() => reply),
          };

          post.mock.calls[0][1](request, reply);

          expect(post.mock.calls[0][0]).toEqual('/_/report/security/csp-violation');
          expect(console.warn).toHaveBeenCalledWith(`CSP Violation: {
  "unit": "testing"
}`);
          expect(reply.status).toHaveBeenCalledWith(204);
          expect(reply.send).toHaveBeenCalled();
        });
      });

      test('/_/report/errors responds with 415', async () => {
        process.env.NODE_ENV = 'production';

        await ssrServer();

        const post = jest.fn();

        register.mock.calls[10][0]({
          register: jest.fn(),
          get: jest.fn(),
          post,
        }, null, jest.fn());

        const request = {
          headers: {
            'content-type': 'text/plain',
          },
        };
        const reply = {
          status: jest.fn(() => reply),
          send: jest.fn(() => reply),
        };

        post.mock.calls[1][1](request, reply);

        expect(post.mock.calls[1][0]).toEqual('/_/report/errors');
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
        expect(reply.status).toHaveBeenCalledWith(415);
        expect(reply.send).toHaveBeenCalledWith('Unsupported Media Type');
      });

      test('/_/report/errors invalid body type', async () => {
        process.env.NODE_ENV = 'production';

        await ssrServer();

        const post = jest.fn();

        register.mock.calls[10][0]({
          register: jest.fn(),
          get: jest.fn(),
          post,
        }, null, jest.fn());

        const request = {
          headers: {
            'content-type': 'application/json',
            'correlation-id': 'correlationId',
            'user-agent': 'userAgent',
          },
          body: 'invalid',
        };
        const reply = {
          status: jest.fn(() => reply),
          send: jest.fn(() => reply),
        };

        post.mock.calls[1][1](request, reply);

        expect(post.mock.calls[1][0]).toEqual('/_/report/errors');
        expect(console.warn).toHaveBeenCalledWith('dropping an error report group, wrong interface (string)');
        expect(console.error).not.toHaveBeenCalled();
        expect(reply.status).toHaveBeenCalledWith(204);
        expect(reply.send).toHaveBeenCalled();
      });

      test('/_/report/errors invalid report items are ignored', async () => {
        process.env.NODE_ENV = 'production';

        await ssrServer();

        const post = jest.fn();

        register.mock.calls[10][0]({
          register: jest.fn(),
          get: jest.fn(),
          post,
        }, null, jest.fn());

        const request = {
          headers: {
            'content-type': 'application/json',
            'correlation-id': 'correlationId',
            'user-agent': 'userAgent',
          },
          body: [
            '',
            false,
            'not an object',
          ],
        };
        const reply = {
          status: jest.fn(() => reply),
          send: jest.fn(() => reply),
        };

        post.mock.calls[1][1](request, reply);

        expect(post.mock.calls[1][0]).toEqual('/_/report/errors');
        expect(console.warn).toHaveBeenCalledWith('dropping an error report, wrong interface (string)');
        expect(console.warn).toHaveBeenCalledWith('dropping an error report, wrong interface (boolean)');
        expect(console.warn).toHaveBeenCalledWith('dropping an error report, wrong interface (string)');
        expect(console.error).not.toHaveBeenCalled();
        expect(reply.status).toHaveBeenCalledWith(204);
        expect(reply.send).toHaveBeenCalled();
      });

      test('/_/report/errors reports errors', async () => {
        process.env.NODE_ENV = 'production';

        await ssrServer();

        const post = jest.fn();

        register.mock.calls[10][0]({
          register: jest.fn(),
          get: jest.fn(),
          post,
        }, null, jest.fn());

        const request = {
          headers: {
            'content-type': 'application/json',
            'correlation-id': 'correlationId',
            'user-agent': 'userAgent',
          },
          body: [{
            msg: 'testing',
            stack: 'stack',
            href: 'href',
            otherData: {
              testing: true,
            },
          }],
        };
        const reply = {
          status: jest.fn(() => reply),
          send: jest.fn(() => reply),
        };

        post.mock.calls[1][1](request, reply);

        expect(post.mock.calls[1][0]).toEqual('/_/report/errors');
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error.mock.calls.length).toBe(1);
        expect(console.error.mock.calls[0][0] instanceof Error).toBe(true);
        expect(console.error.mock.calls[0][0].name).toBe('ClientReportedError');
        expect(console.error.mock.calls[0][0].stack).toBe('stack');
        expect(console.error.mock.calls[0][0].userAgent).toBe('userAgent');
        expect(console.error.mock.calls[0][0].uri).toBe('href');
        expect(console.error.mock.calls[0][0].metaData).toEqual({
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

        const get = jest.fn();
        register.mock.calls[11][0]({
          register: jest.fn(),
          get,
        }, null, jest.fn());

        const reply = {
          sendHtml: jest.fn(() => reply),
        };

        get.mock.calls[0][1](null, reply);

        expect(get.mock.calls[0][0]).toEqual('/_/pwa/shell');
        expect(reply.sendHtml).toHaveBeenCalled();
      });

      test('/_/pwa/shell responds with 404', async () => {
        _setConfig({
          serviceWorker: false,
        });

        await ssrServer();

        const get = jest.fn();
        register.mock.calls[11][0]({
          register: jest.fn(),
          get,
        }, null, jest.fn());

        const reply = {
          status: jest.fn(() => reply),
          send: jest.fn(() => reply),
        };

        get.mock.calls[0][1](null, reply);

        expect(get.mock.calls[0][0]).toEqual('/_/pwa/shell');
        expect(reply.status).toHaveBeenCalledWith(404);
        expect(reply.send).toHaveBeenCalledWith('Not found');
      });

      test('any other GET route renders html', async () => {
        await ssrServer();

        const get = jest.fn();
        register.mock.calls[11][0]({
          register: jest.fn(),
          get,
        }, null, jest.fn());

        const reply = {
          sendHtml: jest.fn(() => reply),
        };

        get.mock.calls[1][1](null, reply);

        expect(get.mock.calls[1][0]).toEqual('/*');
        expect(reply.sendHtml).toHaveBeenCalled();
      });

      test('any other POST route renders html is disabled', async () => {
        await ssrServer();

        const post = jest.fn();
        register.mock.calls[11][0]({
          register: jest.fn(),
          get: jest.fn(),
          post,
        }, null, jest.fn());

        expect(post).not.toHaveBeenCalled();
      });

      test('any other POST route renders html', async () => {
        process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES = 'true';

        await ssrServer();

        const post = jest.fn();
        register.mock.calls[11][0]({
          register: jest.fn(),
          get: jest.fn(),
          post,
        }, null, jest.fn());

        const reply = {
          sendHtml: jest.fn(() => reply),
        };

        post.mock.calls[0][1](null, reply);

        expect(post.mock.calls[0][0]).toEqual('/*');
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
      const request = {
        method: 'get',
        url: '/example',
        headers: {},
      };
      const reply = {
        code: jest.fn(() => reply),
        send: jest.fn(() => reply),
        raw: {},
      };

      await setErrorHandler.mock.calls[0][0](error, request, reply);

      expect(console.error).toHaveBeenCalledWith('Fastify application error: method get, url "/example", correlationId "undefined", headersSent: false', error);
      expect(renderStaticErrorPage).toHaveBeenCalledWith(request, reply);
    });

    test('setErrorHandler logs an error and renders the static error page with "headersSent" and "correlationId"', async () => {
      _setConfig({
        serviceWorker: false,
      });

      await ssrServer();

      const error = new Error('testing');
      const request = {
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

      expect(console.error).toHaveBeenCalledWith('Fastify application error: method get, url "/example", correlationId "123", headersSent: true', error);
      expect(renderStaticErrorPage).toHaveBeenCalledWith(request, reply);
    });
  });
});
