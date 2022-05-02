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
jest.mock('body-parser', () => ({
  json: jest.fn(() => (request_, res, next) => next()),
  urlencoded: jest.fn(() => (request_, res, next) => next()),
}));
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
jest.mock('../../src/server/utils/logging/serverMiddleware', () => (request_, res, next) => setImmediate(next));
jest.mock('../../src/universal/index');
jest.mock('../../src/server/middleware/pwa', () => {
  const serviceWorker = jest.fn((request_, res, next) => next());
  const webManifest = jest.fn((request_, res, next) => next());
  const offline = jest.fn((request_, res, next) => next());
  return {
    serviceWorker,
    webManifest,
    offline,
    serviceWorkerMiddleware: () => serviceWorker,
    webManifestMiddleware: () => webManifest,
    offlineMiddleware: () => offline,
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
    delete process.env.ONE_MAX_POST_REQUEST_PAYLOAD;
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
    let urlencoded;
    let forwardedHeaderParser;
    let serviceWorker;
    let webManifest;
    let offline;

    function loadServer() {
      ({ json, urlencoded } = require('body-parser'));
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
      ({ serviceWorker, webManifest, offline } = require('../../src/server/middleware/pwa'));
      const server = require('../../src/server/ssrServer').default;

      return server;
    }

    it('should return an unformatted 404 response for a missing JSON file', async () => {
      const response = await request(loadServer())
        .get('/_/static/locale/xx-XX/error-message.json');
      expect(response.status).toEqual(404);
      expect(response.text).toEqual('Not Found');
      expect(response.type).toEqual('text/plain');
    });

    it('should return an unformatted 404 response for a missing CSS file', async () => {
      const response = await request(loadServer())
        .get('/_/static/404.css');
      expect(response.status).toEqual(404);
      expect(response.text).toEqual('Not Found');
      expect(response.type).toEqual('text/plain');
    });

    it('should return an unformatted 404 response for a missing JS file', async () => {
      const response = await request(loadServer())
        .get('/bad-url.js');
      expect(response.text).toEqual('Not Found');
      expect(response.status).toEqual(404);
      expect(response.type).toEqual('text/plain');
    });

    it('should return an unformatted 404 response for a missing sourcemap', async () => {
      const response = await request(loadServer())
        .get('/bad-url.js.map');

      expect(response.status).toEqual(404);
      expect(response.text).toEqual('Not Found');
      expect(response.type).toEqual('text/plain');
    });

    it('should return a 200 response for the readiness check', async () => {
      const response = await request(loadServer())
        .get('/_/status');
      expect(response.status).toEqual(200);
      expect(response.text).toEqual('OK');
      expect(response.type).toEqual('text/plain');
    });

    it('should use rendering middleware for HTML requests', async () => {
      const { text, type } = await request(loadServer())
        .get('/some.html');
      expect(addSecurityHeaders).toBeCalled();
      expect(createRequestHtmlFragment).toHaveBeenCalledTimes(1);
      expect(sendHtml).toHaveBeenCalledTimes(1);
      expect(text.trim().slice(0, 15).toLowerCase()).toEqual('<!doctype html>');
      expect(type).toEqual('text/html');
    });

    it('should use rendering middleware for requests with no extension', async () => {
      const response = await request(loadServer())
        .get('/404');
      expect(addSecurityHeaders).toBeCalled();
      expect(createRequestHtmlFragment).toHaveBeenCalledTimes(1);
      expect(sendHtml).toBeCalled();
      expect(response.text.trim().slice(0, 15).toLowerCase()).toEqual('<!doctype html>');
      expect(response.type).toEqual('text/html');
    });

    it('should add security headers for assets', async () => {
      await request(loadServer())
        .get('/_/static');
      expect(addSecurityHeaders).toBeCalled();
    });

    it('should not add cache headers for assets', async () => {
      await request(loadServer())
        .get('/_/static');
      expect(addCacheHeaders).not.toBeCalled();
    });

    it('should add cache headers for all get calls', async () => {
      await request(loadServer())
        .get('/route');
      expect(addCacheHeaders).toBeCalled();
    });

    it('should call service worker middleware', async () => {
      await request(loadServer())
        .get('/_/pwa/service-worker.js');
      expect(serviceWorker).toBeCalled();
    });

    it('should call web manifest middleware', async () => {
      await request(loadServer())
        .get('/_/pwa/manifest.webmanifest');
      expect(webManifest).toBeCalled();
    });

    it('should call offline middleware and other html middleware', async () => {
      await request(loadServer())
        .get('/_/pwa/shell');
      expect(addFrameOptionsHeader).toBeCalled();
      expect(createRequestStore).toBeCalled();
      expect(offline).toBeCalled();
      expect(sendHtml).toBeCalled();
    });

    it('should call errors logging', async () => {
      await request(loadServer())
        .post('/_/report/errors');
      expect(clientErrorLogger).toBeCalled();
    });

    it('should set the expected app version header', async () => {
      const response = await request(loadServer())
        .get('/any-path');
      expect(setAppVersionHeader).toHaveBeenCalled();
      expect(response.headers['one-app-version']).toBe('x.0.0');
    });

    it('should add security headers for all get calls', async () => {
      await request(loadServer())
        .get('/route');
      expect(addSecurityHeaders).toBeCalled();
    });

    it('should add csp headers for all get calls', async () => {
      await request(loadServer())
        .get('/route');
      expect(csp).toBeCalled();
    });

    it('should create request store for all get calls', async () => {
      await request(loadServer())
        .get('/route');
      expect(createRequestStore).toBeCalled();
    });

    it('should conditionally include CORS headers for all get calls', async () => {
      expect.assertions(1);
      await request(loadServer())
        .get('/route');
      expect(conditionallyAllowCors).toBeCalled();
    });

    it('should parse forwarded header for all get calls', async () => {
      await request(loadServer())
        .get('/route');
      expect(forwardedHeaderParser).toBeCalled();
    });

    describe('enablePostToModuleRoutes', () => {
      beforeEach(() => {
        process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES = 'true';
      });

      it('should check the state for a status code for all post calls', async () => {
        await request(loadServer())
          .post('/route');
        expect(checkStateForStatusCode).toBeCalled();
      });

      it('should respond with a 404 when not enabled', async () => {
        delete process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES;
        const response = await request(loadServer())
          .post('/any-path');
        return expect(response.status).toEqual(404);
      });

      it('should set the expected app version header for a render post call', async () => {
        const response = await request(loadServer())
          .post('/any-path');
        expect(setAppVersionHeader).toHaveBeenCalled();
        expect(response.headers['one-app-version']).toBe('x.0.0');
      });

      it('should add security headers for render post pre-flight options calls', async () => {
        await request(loadServer())
          .options('/route');
        expect(addSecurityHeaders).toBeCalled();
      });

      it('should add security headers for render post calls', async () => {
        await request(loadServer())
          .post('/route');
        expect(addSecurityHeaders).toBeCalled();
      });

      it('should configure json parsing with a maximum limit for render post pre-flight options calls', async () => {
        await request(loadServer())
          .options('/route');
        expect(json).toBeCalled();
        expect(json.mock.calls[1][0]).toHaveProperty('limit', '0kb');
      });

      it('should configure json parsing with a maximum limit for render post calls', async () => {
        process.env.ONE_MAX_POST_REQUEST_PAYLOAD = '100kb';
        await request(loadServer())
          .post('/route');
        expect(json).toBeCalled();
        expect(json.mock.calls[2][0]).toHaveProperty('limit', '100kb');
      });
      it('should configure urlencoded parsing with a maximum limit for render post pre-flight options calls', async () => {
        await request(loadServer())
          .options('/route');
        expect(urlencoded).toBeCalled();
        expect(json.mock.calls[1][0]).toHaveProperty('limit', '0kb');
      });

      it('should configure json urlencoded with a maximum limit for render post calls', async () => {
        process.env.ONE_MAX_POST_REQUEST_PAYLOAD = '25kb';
        await request(loadServer())
          .post('/route');
        expect(urlencoded).toBeCalled();
        expect(json.mock.calls[2][0]).toHaveProperty('limit', '25kb');
      });

      describe('cors for render post calls', () => {
        it('pre-flight OPTIONS should not respond with CORS headers', async () => {
          const response = await request(loadServer())
            .options('/route')
            .set('Origin', 'test.example.com');
          expect(response.status).toEqual(200);
          // preflight-only headers
          expect(response.headers).not.toHaveProperty('access-control-max-age');
          expect(response.headers).not.toHaveProperty('access-control-allow-methods');
          expect(response.headers).not.toHaveProperty('access-control-allow-headers');
          // any response headers
          expect(response.headers).not.toHaveProperty('access-control-allow-origin');
          expect(response.headers).not.toHaveProperty('access-control-expose-headers');
          expect(response.headers).not.toHaveProperty('access-control-allow-credentials');
        });
        it('POST should conditionally include CORS headers', async () => {
          expect.assertions(1);
          await request(loadServer())
            .post('/route')
            .set('Origin', 'test.example.com');
          expect(conditionallyAllowCors).toBeCalled();
        });
      });

      it('should add csp headers for render post calls', async () => {
        await request(loadServer())
          .post('/route');
        expect(csp).toBeCalled();
      });

      it('should create request store using the body for building initial state for render post calls', async () => {
        await request(loadServer())
          .post('/route');
        expect(createRequestStore).toBeCalled();
        expect(createRequestStore.mock.calls[1][1]).toEqual(
          { useBodyForBuildingTheInitialState: true }
        );
      });

      it('should parse forwarded header for render post calls', async () => {
        await request(loadServer())
          .post('/route');
        expect(forwardedHeaderParser).toBeCalled();
      });
    });

    it('should log the csp violation request body', async () => {
      await request(loadServer())
        .post('/_/report/security/csp-violation')
        .send({ body: 'foo', other: 'boo' });
      expect(cspViolation).toHaveBeenCalled();
    });

    it('should create send html for all get calls', async () => {
      await request(loadServer())
        .get('/route');
      expect(sendHtml).toBeCalled();
    });

    it('should not call route specific middleware to be called on non-matching routes', async () => {
      await request(loadServer())
        .get('/route');
      expect(cspViolation).not.toHaveBeenCalled();
      expect(clientErrorLogger).not.toHaveBeenCalled();
    });

    it('should create request html fragment for all get calls', async () => {
      await request(loadServer())
        .get('/route');
      expect(createRequestHtmlFragment).toBeCalled();
    });

    it('should check the state for a redirect for all get calls', async () => {
      await request(loadServer())
        .get('/route');
      expect(checkStateForRedirect).toBeCalled();
    });

    it('should check the state for a status code for all get calls', async () => {
      await request(loadServer())
        .get('/route');
      expect(checkStateForStatusCode).toBeCalled();
    });

    it('should add frame options header for all get calls', async () => {
      await request(loadServer())
        .get('/route');
      expect(addFrameOptionsHeader).toBeCalled();
    });

    it('should return the static error page when an error was encountered', async () => {
      const middlewareError = new Error('test error after body sent');

      const express = require('express');
      const buggyApp = express()
        .use((request_, res, next) => {
          next(middlewareError);
        });
      express.mockReturnValueOnce(buggyApp);

      const response = await request(loadServer())
        .get('/anything');

      expect(response.status).toEqual(500);
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(middlewareError, 'express application error: method GET, url "/anything", correlationId "undefined", headersSent: false');
      expect(response.type).toEqual('text/html');
      expect(response.text).toMatch('<h2 style="display: flex; justify-content: center; padding: 40px 15px 0px;">Loading Error</h2>');
      expect(response.text).toMatch('Sorry, we are unable to load this page at this time.');
      expect(response.text).toMatch('Please try again later.');
    });

    it('should return the static error page when the URL is malformed', async () => {
      const res = await request(loadServer())
        .get('/%c0%2e%c0%2e/%c0%2e%c0%2e/%c0%2e%c0%2e/%c0%2e%c0%2e/rockpj/rock.exe');
      expect(renderStaticErrorPage).toHaveBeenCalled();
      expect(res.status).toEqual(400);
      expect(res.type).toEqual('text/html');
      expect(res.text).toMatch('<h2 style="display: flex; justify-content: center; padding: 40px 15px 0px;">Loading Error</h2>');
      expect(res.text).toMatch('Sorry, we are unable to load this page at this time.');
      expect(res.text).not.toMatch('Please try again later.');
    });

    it('should not alter the response in flight when an error was encountered', async () => {
      const middlewareError = new Error('test error after body sent');

      const express = require('express');
      const buggyApp = express()
        .use((request_, res, next) => {
          res.status(201).send('hello');
          next(middlewareError);
        });
      express.mockReturnValueOnce(buggyApp);
      let res;
      try {
        res = await request(loadServer())
          .get('/anything');
      } catch (_error) {
        // do nothing
      }

      expect(res.status).toEqual(201);
      // Called twice because express also calls console.error in test
      expect(console.error).toHaveBeenCalledTimes(2);
      expect(console.error).toHaveBeenCalledWith(middlewareError, 'express application error: method GET, url "/anything", correlationId "undefined", headersSent: true');
      expect(res.text).toMatch('hello');
    });
  });
});
