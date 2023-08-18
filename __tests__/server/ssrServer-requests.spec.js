/*
 * Copyright 2023 American Express Travel Related Services Company, Inc.
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

import ssrServer from '../../src/server/ssrServer';

const { NODE_ENV } = process.env;
const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

jest.mock('fastify-metrics', () => (_req, _opts, done) => done());

describe('ssrServer route testing', () => {
  afterAll(() => {
    process.env.NODE_ENV = NODE_ENV;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('/_/status', async () => {
    const server = await ssrServer();
    const resp = await server.inject({
      method: 'GET',
      url: '/_/status',
    });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual('OK');
  });

  describe('/_/report/security/csp-violation', () => {
    describe('production', () => {
      let server;
      beforeAll(async () => {
        process.env.NODE_ENV = 'production';
        server = await ssrServer();
      });

      test('with csp-report', async () => {
        const resp = await server.inject({
          method: 'POST',
          url: '/_/report/security/csp-violation',
          headers: {
            'Content-Type': 'application/csp-report',
          },
          payload: JSON.stringify({
            'csp-report': {
              'document-uri': 'bad.example.com',
            },
          }),
        });
        expect(warnSpy).toHaveBeenCalledWith('CSP Violation: {"csp-report":{"document-uri":"bad.example.com"}}');
        expect(resp.statusCode).toEqual(204);
      });

      test('when csp-report is not provided', async () => {
        const resp = await server.inject({
          method: 'POST',
          url: '/_/report/security/csp-violation',
          headers: {
            'Content-Type': 'application/csp-report',
          },
        });
        expect(warnSpy).toHaveBeenCalledWith('CSP Violation: No data received!');
        expect(resp.statusCode).toEqual(204);
      });
    });

    describe('development', () => {
      let server;
      beforeAll(async () => {
        process.env.NODE_ENV = 'development';
        server = await ssrServer();
      });

      test('with csp-report', async () => {
        const resp = await server.inject({
          method: 'POST',
          url: '/_/report/security/csp-violation',
          headers: {
            'Content-Type': 'application/csp-report',
          },
          payload: JSON.stringify({
            'csp-report': {
              'document-uri': 'bad.example.com',
              'violated-directive': 'script-src',
              'blocked-uri': 'blockedUri.example.com',
              'line-number': '123',
              'column-number': '432',
              'source-file': 'sourceFile.js',
            },
          }),
        });
        expect(warnSpy).toHaveBeenCalledWith('CSP Violation: sourceFile.js:123:432 on page bad.example.com violated the script-src policy via blockedUri.example.com');
        expect(resp.statusCode).toEqual(204);
      });

      test('when no csp-report', async () => {
        const resp = await server.inject({
          method: 'POST',
          url: '/_/report/security/csp-violation',
          headers: {
            'Content-Type': 'application/csp-report',
          },
        });
        expect(warnSpy).toHaveBeenCalledWith('CSP Violation reported, but no data received');
        expect(resp.statusCode).toEqual(204);
      });
    });
  });
});
