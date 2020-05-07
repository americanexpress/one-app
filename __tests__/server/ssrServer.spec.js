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

import request from 'supertest';

jest.mock('express');
jest.mock('body-parser', () => ({ json: jest.fn(() => (req, res, next) => next()) }));
jest.mock('../../src/server/middleware/clientErrorLogger');
jest.mock('../../src/server/middleware/setAppVersionHeader');
jest.mock('../../src/server/middleware/addSecurityHeaders');
jest.mock('../../src/server/middleware/createRequestStore');
jest.mock('../../src/server/middleware/createRequestHtmlFragment');
jest.mock('../../src/server/middleware/checkStateForRedirect');
jest.mock('../../src/server/middleware/checkStateForStatusCode');
jest.mock('../../src/server/middleware/conditionallyAllowCors');
jest.mock('../../src/server/middleware/csp');
jest.mock('../../src/server/middleware/cspViolation');
jest.mock('../../src/server/middleware/sendHtml');
jest.mock('../../src/server/middleware/addCacheHeaders');
jest.mock('../../src/server/middleware/addFrameOptionsHeader');
jest.mock('../../src/server/middleware/forwardedHeaderParser');
jest.mock('../../src/server/utils/logging/serverMiddleware', () => (req, res, next) => setImmediate(next));
jest.mock('../../src/universal/index');
jest.mock('../../src/server/middleware/pwa', () => {
  const serviceWorker = jest.fn((req, res, next) => next());
  const webManifest = jest.fn((req, res, next) => next());
  return {
    serviceWorker,
    webManifest,
    serviceWorkerMiddleware: () => serviceWorker,
    webManifestMiddleware: () => webManifest,
  };
});
jest.mock('../../mocks/scenarios', () => ({
  scenarios: true,
}), { virtual: true });

describe('ssrServer', () => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
    delete process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES;
  });

  describe('middleware order', () => {
    it('first ensures the request has a correlation id', () => {
      const ensureCorrelationId = require('../../src/server/middleware/ensureCorrelationId').default;
      const { createApp } = require('../../src/server/ssrServer');
      const app = createApp();

      expect(app.use).toHaveBeenCalled();
      expect(app.use.mock.calls[0][0]).toEqual(ensureCorrelationId);
    });

    it('ensures the request will be logged', () => {
      const serverLoggingMiddleware = require('../../src/server/utils/logging/serverMiddleware');
      const { createApp } = require('../../src/server/ssrServer');
      const app = createApp();

      expect(app.use).toHaveBeenCalled();
      expect(app.use.mock.calls[1][0]).toEqual(serverLoggingMiddleware);
    });

    it('ensures forwarded header in the request is parsed if present', () => {
      const forwardedHeaderParser = require('../../src/server/middleware/forwardedHeaderParser').default;
      const { createApp } = require('../../src/server/ssrServer');
      const app = createApp();

      expect(app.use).toHaveBeenCalled();
      expect(app.use.mock.calls[4][0]).toEqual(forwardedHeaderParser);
    });
  });

  describe('app server', () => {
    let clientErrorLogger;
    let setAppVersionHeader;
    let addSecurityHeaders;
    let createRequestStore;
    let createRequestHtmlFragment;
    let checkStateForRedirect;
    let checkStateForStatusCode;
    let sendHtml;
    let renderStaticErrorPage;
    let conditionallyAllowCors;
    let csp;
    let cspViolation;
    let addFrameOptionsHeader;
    let addCacheHeaders;
    let json;
    let forwardedHeaderParser;
    let serviceWorker;
    let webManifest;

    function loadServer() {
      ({ json } = require('body-parser'));
      clientErrorLogger = require('../../src/server/middleware/clientErrorLogger').default;
      setAppVersionHeader = require('../../src/server/middleware/setAppVersionHeader').default;
      addSecurityHeaders = require('../../src/server/middleware/addSecurityHeaders').default;
      createRequestStore = require('../../src/server/middleware/createRequestStore').default;
      createRequestHtmlFragment = require(
        '../../src/server/middleware/createRequestHtmlFragment'
      ).default;
      checkStateForRedirect = require('../../src/server/middleware/checkStateForRedirect').default;
      checkStateForStatusCode = require('../../src/server/middleware/checkStateForStatusCode').default;
      conditionallyAllowCors = require('../../src/server/middleware/conditionallyAllowCors').default;
      csp = require('../../src/server/middleware/csp').default;
      cspViolation = require('../../src/server/middleware/cspViolation').default;
      ({ default: sendHtml, renderStaticErrorPage } = require('../../src/server/middleware/sendHtml'));
      addFrameOptionsHeader = require('../../src/server/middleware/addFrameOptionsHeader').default;
      addCacheHeaders = require('../../src/server/middleware/addCacheHeaders').default;
      forwardedHeaderParser = require('../../src/server/middleware/forwardedHeaderParser').default;
      ({ serviceWorker, webManifest } = require('../../src/server/middleware/pwa'));
      const server = require('../../src/server/ssrServer').default;

      return server;
    }

    it('should return an unformatted 404 response for a missing JSON file', (done) => {
      request(loadServer())
        .get('/_/static/locale/xx-XX/error-message.json')
        .end((err, res) => {
          expect(res.status).toEqual(404);
          expect(res.text).toEqual('Not Found');
          expect(res.type).toEqual('text/plain');
          done();
        });
    });

    it('should return an unformatted 404 response for a missing CSS file', (done) => {
      request(loadServer())
        .get('/_/static/404.css')
        .end((error, res) => {
          expect(res.status).toEqual(404);
          expect(res.text).toEqual('Not Found');
          expect(res.type).toEqual('text/plain');
          done();
        });
    });

    it('should return an unformatted 404 response for a missing JS file', (done) => {
      request(loadServer())
        .get('/bad-url.js')
        .end((error, res) => {
          expect(res.status).toEqual(404);
          expect(res.text).toEqual('Not Found');
          expect(res.type).toEqual('text/plain');
          done();
        });
    });

    it('should return an unformatted 404 response for a missing sourcemap', (done) => {
      request(loadServer())
        .get('/bad-url.js.map')
        .end((error, res) => {
          expect(res.status).toEqual(404);
          expect(res.text).toEqual('Not Found');
          expect(res.type).toEqual('text/plain');
          done();
        });
    });

    it('should use rendering middleware for HTML requests', (done) => {
      request(loadServer())
        .get('/some.html')
        .end((error, { text, type }) => {
          expect(addSecurityHeaders).toBeCalled();
          expect(createRequestHtmlFragment).toHaveBeenCalledTimes(1);
          expect(sendHtml).toHaveBeenCalledTimes(1);
          expect(text.trim().substr(0, 15).toLowerCase()).toEqual('<!doctype html>');
          expect(type).toEqual('text/html');
          done();
        });
    });

    it('should use rendering middleware for requests with no extension', (done) => {
      request(loadServer())
        .get('/404')
        .end((error, res) => {
          expect(addSecurityHeaders).toBeCalled();
          expect(createRequestHtmlFragment).toHaveBeenCalledTimes(1);
          expect(sendHtml).toBeCalled();
          expect(res.text.trim().substr(0, 15).toLowerCase()).toEqual('<!doctype html>');
          expect(res.type).toEqual('text/html');
          done();
        });
    });

    it('should compress assets', (done) => {
      request(loadServer())
        .get('/_/static')
        .expect('Content-Encoding', 'gzip')
        .end(() => {
          done();
        });
    });

    it('should add security headers for assets', (done) => {
      request(loadServer())
        .get('/_/static')
        .end(() => {
          expect(addSecurityHeaders).toBeCalled();
          done();
        });
    });

    it('should not add cache headers for assets', (done) => {
      request(loadServer())
        .get('/_/static')
        .end(() => {
          expect(addCacheHeaders).not.toBeCalled();
          done();
        });
    });

    it('should add cache headers for all get calls', (done) => {
      request(loadServer())
        .get('/route')
        .end(() => {
          expect(addCacheHeaders).toBeCalled();
          done();
        });
    });

    it('should call service worker middleware', (done) => {
      request(loadServer())
        .get('/_/pwa/service-worker.js')
        .end(() => {
          expect(serviceWorker).toBeCalled();
          done();
        });
    });

    it('should call web manifest middleware', (done) => {
      request(loadServer())
        .get('/_/pwa/manifest.webmanifest')
        .end(() => {
          expect(webManifest).toBeCalled();
          done();
        });
    });

    it('should call errors logging', (done) => {
      request(loadServer())
        .post('/_/report/errors')
        .end(() => {
          expect(clientErrorLogger).toBeCalled();
          done();
        });
    });

    it('should set the expected app version header', (done) => {
      request(loadServer())
        .get('/any-path')
        .end((err, res) => {
          expect(setAppVersionHeader).toHaveBeenCalled();
          expect(res.headers['one-app-version']).toBe('x.0.0');
          done();
        });
    });

    it('should add security headers for all get calls', (done) => {
      request(loadServer())
        .get('/route')
        .end(() => {
          expect(addSecurityHeaders).toBeCalled();
          done();
        });
    });

    it('should add csp headers for all get calls', (done) => {
      request(loadServer())
        .get('/route')
        .end(() => {
          expect(csp).toBeCalled();
          done();
        });
    });

    it('should create request store for all get calls', (done) => {
      request(loadServer())
        .get('/route')
        .end(() => {
          expect(createRequestStore).toBeCalled();
          done();
        });
    });

    it('should conditionally include CORS headers for all get calls', (done) => {
      expect.assertions(1);
      request(loadServer())
        .get('/route')
        .end(() => {
          expect(conditionallyAllowCors).toBeCalled();
          return done();
        });
    });

    it('should parse forwarded header for all get calls', (done) => {
      request(loadServer())
        .get('/route')
        .end(() => {
          expect(forwardedHeaderParser).toBeCalled();
          done();
        });
    });

    describe('enablePostToModuleRoutes', () => {
      beforeEach(() => {
        process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES = 'yes';
      });

      it('should check the state for a status code for all post calls', (done) => {
        request(loadServer())
          .post('/route')
          .end(() => {
            expect(checkStateForStatusCode).toBeCalled();
            done();
          });
      });

      it('should respond with a 404 when not enabled', (done) => {
        delete process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES;
        request(loadServer())
          .post('/any-path')
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res.status).toEqual(404);
            return done();
          });
      });

      it('should set the expected app version header for a render post call', (done) => {
        request(loadServer())
          .post('/any-path')
          .end((err, res) => {
            expect(setAppVersionHeader).toHaveBeenCalled();
            expect(res.headers['one-app-version']).toBe('x.0.0');
            done();
          });
      });

      it('should add security headers for render post pre-flight options calls', (done) => {
        request(loadServer())
          .options('/route')
          .end(() => {
            expect(addSecurityHeaders).toBeCalled();
            done();
          });
      });

      it('should add security headers for render post calls', (done) => {
        request(loadServer())
          .post('/route')
          .end(() => {
            expect(addSecurityHeaders).toBeCalled();
            done();
          });
      });

      it('should configure json parsing with a maximum limit for render post pre-flight options calls', (done) => {
        request(loadServer())
          .options('/route')
          .end(() => {
            expect(json).toBeCalled();
            expect(json.mock.calls[1][0]).toHaveProperty('limit', '0kb');
            done();
          });
      });

      it('should configure json parsing with a maximum limit for render post calls', (done) => {
        request(loadServer())
          .post('/route')
          .end(() => {
            expect(json).toBeCalled();
            expect(json.mock.calls[2][0]).toHaveProperty('limit', '15kb');
            done();
          });
      });

      describe('cors for render post calls', () => {
        it('pre-flight OPTIONS should not respond with CORS headers', (done) => {
          request(loadServer())
            .options('/route')
            .set('Origin', 'test.example.com')
            .end((err, res) => {
              if (err) {
                return done(err);
              }
              expect(res.status).toEqual(200);
              // preflight-only headers
              expect(res.headers).not.toHaveProperty('access-control-max-age');
              expect(res.headers).not.toHaveProperty('access-control-allow-methods');
              expect(res.headers).not.toHaveProperty('access-control-allow-headers');
              // any respnse headers
              expect(res.headers).not.toHaveProperty('access-control-allow-origin');
              expect(res.headers).not.toHaveProperty('access-control-expose-headers');
              expect(res.headers).not.toHaveProperty('access-control-allow-credentials');
              return done();
            });
        });
        it('POST should conditionally include CORS headers', (done) => {
          expect.assertions(1);
          request(loadServer())
            .post('/route')
            .set('Origin', 'test.example.com')
            .end(() => {
              expect(conditionallyAllowCors).toBeCalled();
              return done();
            });
        });
      });

      it('should add csp headers for render post calls', (done) => {
        request(loadServer())
          .post('/route')
          .end(() => {
            expect(csp).toBeCalled();
            done();
          });
      });

      it('should create request store using the body for building initial state for render post calls', (done) => {
        request(loadServer())
          .post('/route')
          .end(() => {
            expect(createRequestStore).toBeCalled();
            expect(createRequestStore.mock.calls[1][1]).toEqual(
              { useBodyForBuildingTheInitialState: true }
            );
            done();
          });
      });

      it('should parse forwarded header for render post calls', (done) => {
        request(loadServer())
          .post('/route')
          .end(() => {
            expect(forwardedHeaderParser).toBeCalled();
            done();
          });
      });
    });

    it('should log the csp violation request body', (done) => {
      request(loadServer())
        .post('/_/report/security/csp-violation')
        .send({ body: 'foo', other: 'boo' })
        .end(() => {
          expect(cspViolation).toHaveBeenCalled();
          done();
        });
    });

    it('should create send html for all get calls', (done) => {
      request(loadServer())
        .get('/route')
        .end(() => {
          expect(sendHtml).toBeCalled();
          done();
        });
    });

    it('should not call route specific middleware to be called on non-matching routes', (done) => {
      request(loadServer())
        .get('/route')
        .end(() => {
          expect(cspViolation).not.toHaveBeenCalled();
          expect(clientErrorLogger).not.toHaveBeenCalled();
          done();
        });
    });

    it('should create request html fragment for all get calls', (done) => {
      request(loadServer())
        .get('/route')
        .end(() => {
          expect(createRequestHtmlFragment).toBeCalled();
          done();
        });
    });

    it('should check the state for a redirect for all get calls', (done) => {
      request(loadServer())
        .get('/route')
        .end(() => {
          expect(checkStateForRedirect).toBeCalled();
          done();
        });
    });

    it('should check the state for a status code for all get calls', (done) => {
      request(loadServer())
        .get('/route')
        .end(() => {
          expect(checkStateForStatusCode).toBeCalled();
          done();
        });
    });

    it('should add frame options header for all get calls', (done) => {
      request(loadServer())
        .get('/route')
        .end(() => {
          expect(addFrameOptionsHeader).toBeCalled();
          done();
        });
    });

    it('should return the static error page when an error was encountered', (done) => {
      const middlewareError = new Error('test error after body sent');

      const express = require('express');
      const buggyApp = express()
        .use((req, res, next) => {
          next(middlewareError);
        });
      express.mockReturnValueOnce(buggyApp);

      request(loadServer())
        .get('/anything')
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.status).toEqual(500);
          expect(console.error).toHaveBeenCalledTimes(1);
          expect(console.error).toHaveBeenCalledWith('express application error', middlewareError);
          expect(res.type).toEqual('text/html');
          expect(res.text).toMatch('<h2 style="display: flex; justify-content: center; padding: 40px 15px 0px;">Loading Error</h2>');
          expect(res.text).toMatch('Sorry, we are unable to load this page at this time.');
          expect(res.text).toMatch('Please try again later.');
          return done();
        });
    });

    it('should return the static error page when the URL is malformed', (done) => {
      request(loadServer())
        .get('/%c0%2e%c0%2e/%c0%2e%c0%2e/%c0%2e%c0%2e/%c0%2e%c0%2e/rockpj/rock.exe')
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(renderStaticErrorPage).toHaveBeenCalled();
          expect(res.status).toEqual(400);
          expect(res.type).toEqual('text/html');
          expect(res.text).toMatch('<h2 style="display: flex; justify-content: center; padding: 40px 15px 0px;">Loading Error</h2>');
          expect(res.text).toMatch('Sorry, we are unable to load this page at this time.');
          expect(res.text).not.toMatch('Please try again later.');
          return done();
        });
    });

    it('should not alter the response in flight when an error was encountered', (done) => {
      const middlewareError = new Error('test error after body sent');

      const express = require('express');
      const buggyApp = express()
        .use((req, res, next) => {
          res.status(201).send('hello');
          next(middlewareError);
        });
      express.mockReturnValueOnce(buggyApp);

      request(loadServer())
        .get('/anything')
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.status).toEqual(201);
          expect(console.error).toHaveBeenCalledTimes(1);
          expect(console.error).toHaveBeenCalledWith('express application error', middlewareError);
          expect(res.text).toMatch('hello');
          return done();
        });
    });
  });
});
