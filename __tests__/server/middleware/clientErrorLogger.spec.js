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

import { createRequest, createResponse } from 'node-mocks-http';
import util from 'util';

describe('clientErrorLogger', () => {
  let clientErrorLogger;
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(util, 'inspect').mockImplementation(() => {});

  function load(nodeEnv) {
    if (typeof nodeEnv !== 'string') {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = nodeEnv;
    }

    jest.resetModules();
    clientErrorLogger = require('../../../src/server/middleware/clientErrorLogger').default;
  }

  describe('development', () => {
    it('should send 200 status with thank you', () => {
      load('development');
      const req = createRequest({ headers: { 'content-type': 'content type headers' } });
      const res = createResponse({ req });
      clientErrorLogger(req, res);
      expect(res.statusCode).toBe(204);
      expect(res.finished).toBe(true);
    });
  });

  describe('production', () => {
    it('should send status 415 for invalid content-type in production', () => {
      load();
      const req = createRequest({ headers: { 'content-type': 'content type headers' } });
      const res = createResponse({ req });
      clientErrorLogger(req, res);
      expect(res.statusCode).toBe(415);
      expect(res.finished).toBe(true);
    });

    it('should send 200 when using application/json as content-type', () => {
      load();
      const req = createRequest({
        headers: {
          'content-type': 'application/json',
          'correlation-id': '123',
        },
        // expect the middleware to parse the JSON
        body: {},
      });
      const res = createResponse({ req });

      console.error.mockClear();
      clientErrorLogger(req, res);
      expect(res.statusCode).toBe(204);
      expect(res.finished).toBe(true);
    });

    it('should log the errors and send 200 when using application/json as content-type', () => {
      load();
      const req = createRequest({
        // expect the middleware to parse the JSON
        body: [{
          msg: 'something broke',
          stack: 'Error: something broke\n    at methodA (resource-a.js:1:1)\n    at methodB (resource-b.js:1:1)\n',
          href: 'https://example.com/page-the/error/occurred-on',
          otherData: {
            moduleID: 'dynamic-layout',
            code: '500',
            collectionMethod: 'applicationError',
          },
        }],
        headers: {
          'content-type': 'application/json',
          'correlation-id': '123abc',
          'user-agent': 'Browser/9.0 (Computer; Hardware Software 19_4_0) PackMule/537.36 (UHTML, like Salamander) Browser/99.2.5.0 Browser/753.36',
        },
      });
      const res = createResponse({ req });

      console.error.mockClear();
      clientErrorLogger(req, res);
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(util.inspect).toHaveBeenCalledTimes(1);
      const logged = util.inspect.mock.calls[0][0];
      expect(logged).toBeInstanceOf(Error);
      expect(logged).toHaveProperty('name', 'ClientReportedError');
      expect(logged).toHaveProperty('stack', 'Error: something broke\n    at methodA (resource-a.js:1:1)\n    at methodB (resource-b.js:1:1)\n');
      expect(logged).toHaveProperty('userAgent', 'Browser/9.0 (Computer; Hardware Software 19_4_0) PackMule/537.36 (UHTML, like Salamander) Browser/99.2.5.0 Browser/753.36');
      expect(logged).toHaveProperty('uri', 'https://example.com/page-the/error/occurred-on');
      expect(logged).toHaveProperty('metaData');
      expect(logged.metaData).toEqual({
        moduleID: 'dynamic-layout',
        code: '500',
        collectionMethod: 'applicationError',
        correlationId: '123abc',
      });
      expect(res.statusCode).toBe(204);
      expect(res.finished).toBe(true);
    });

    it('should not log the report when not given an array', () => {
      load();
      const req = createRequest({
        // expect the middleware to parse the JSON
        body: 'oh, hello',
        headers: {
          'content-type': 'application/json',
          'correlation-id': '123',
        },
      });
      const res = createResponse({ req });

      console.error.mockClear();
      clientErrorLogger(req, res);
      expect(console.error).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(204);
      expect(res.finished).toBe(true);
    });

    it('should log a warning when not given an array', () => {
      load();
      const req = createRequest({
        // expect the middleware to parse the JSON
        body: 'oh, hello',
        headers: {
          'content-type': 'application/json',
          'correlation-id': '123',
        },
      });
      const res = createResponse({ req });

      console.warn.mockClear();
      clientErrorLogger(req, res);
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn.mock.calls[0]).toMatchSnapshot();
    });

    it('should not log the report when given an array of not objects', () => {
      load();
      const req = createRequest({
        // expect the middleware to parse the JSON
        body: [null, 'oh, hello', 12],
        headers: {
          'content-type': 'application/json',
          'correlation-id': '123',
        },
      });
      const res = createResponse({ req });

      console.error.mockClear();
      clientErrorLogger(req, res);
      expect(console.error).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(204);
      expect(res.finished).toBe(true);
    });

    it('should log a warning when given an array of not objects', () => {
      load();
      const req = createRequest({
        // expect the middleware to parse the JSON
        body: ['oh, hello'],
        headers: {
          'content-type': 'application/json',
          'correlation-id': '123',
        },
      });
      const res = createResponse({ req });

      console.warn.mockClear();
      clientErrorLogger(req, res);
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn.mock.calls[0]).toMatchSnapshot();
    });
  });
});
