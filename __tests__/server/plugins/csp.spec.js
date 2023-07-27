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
/* eslint-disable global-require */

import Fastify from 'fastify';
import csp, { updateCSP, getCSP, cspCache } from '../../../src/server/plugins/csp';

const sanitizeCspString = (cspString) => cspString
  // replaces dynamic ip to prevent snapshot failures
  // eslint-disable-next-line unicorn/better-regex -- conflicts with unsafe-regex
  .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '0.0.0.0');

const buildApp = async () => {
  const app = Fastify();

  app.register(csp);

  app.get('/', () => 'test');

  return app;
};

jest.spyOn(console, 'error').mockImplementation(() => {});

describe('csp', () => {
  beforeEach(() => {
    process.env.ONE_DANGEROUSLY_DISABLE_CSP = 'false';
  });

  it('sets a csp header in development', async () => {
    const response = await (await buildApp()).inject({
      method: 'GET',
      url: '/',
    });
    const { headers } = response;

    expect(headers).toHaveProperty('content-security-policy');
    expect(headers).not.toHaveProperty('content-security-policy-report-only');
  });

  it('sets csp header to null if ONE_DANGEROUSLY_DISABLE_CSP is present', async () => {
    process.env.ONE_DANGEROUSLY_DISABLE_CSP = 'true';
    const response = await (await buildApp()).inject({
      method: 'GET',
      url: '/',
    });
    const { headers } = response;
    expect(headers['content-security-policy']).toBe(null);
    expect(headers).toHaveProperty('content-security-policy');
  });

  it('defaults to production csp', async () => {
    delete process.env.NODE_ENV;

    const response = await (await buildApp()).inject({
      method: 'GET',
      url: '/',
    });
    const { headers } = response;

    expect(headers).toHaveProperty('content-security-policy');
    expect(headers).not.toHaveProperty('content-security-policy-report-only');
  });

  it('adds ip and localhost to csp in development', async () => {
    process.env.NODE_ENV = 'development';
    process.env.HTTP_ONE_APP_DEV_CDN_PORT = 5000;
    process.env.HTTP_ONE_APP_DEV_PROXY_SERVER_PORT = 3001;

    updateCSP("default-src 'none'; script-src 'self'; connect-src 'self';");

    const response = await (await buildApp()).inject({
      method: 'GET',
      url: '/',
    });
    const { headers } = response;

    expect(headers).toHaveProperty('content-security-policy');

    const cspString = headers['content-security-policy'];

    expect(sanitizeCspString(cspString)).toMatchSnapshot();
  });

  it('does not add ip and localhost to csp in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.HTTP_ONE_APP_DEV_CDN_PORT;
    delete process.env.HTTP_ONE_APP_DEV_PROXY_SERVER_PORT;

    updateCSP("default-src 'none'; script-src 'self'; connect-src 'self';");
    const response = await (await buildApp()).inject({
      method: 'GET',
      url: '/',
    });
    const { headers } = response;

    expect(headers).toHaveProperty('content-security-policy');
    const cspString = headers['content-security-policy'];
    // eslint-disable-next-line unicorn/better-regex
    const ipFound = cspString.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
    expect(ipFound).toBeNull();
    const localhostFound = cspString.match(/localhost/);
    expect(localhostFound).toBeNull();
  });

  it('sets script nonce', async () => {
    updateCSP("default-src 'none'; script-src 'self';");
    const response = await (await buildApp()).inject({
      method: 'GET',
      url: '/',
    });
    const { headers } = response;
    expect(headers).toHaveProperty('content-security-policy');
    expect(headers['content-security-policy'].includes('nonce-')).toBe(true);
  });

  it('does not set the script nonce if this has been disabled in development', async () => {
    process.env.NODE_ENV = 'development';
    process.env.ONE_CSP_ALLOW_INLINE_SCRIPTS = 'true';

    updateCSP("default-src 'none'; script-src 'self';");

    const response = await (await buildApp()).inject({
      method: 'GET',
      url: '/',
    });

    expect(response.headers['content-security-policy'].includes('nonce-')).toBe(false);
  });

  describe('policy', () => {
    it('should be a constant string and not function so it cannot be regenerated per request', () => {
      expect(cspCache.policy).toEqual(expect.any(String));
    });
  });

  describe('updateCSP', () => {
    it('should accept an empty string', () => {
      updateCSP('');
      expect(getCSP()).toEqual({});
    });

    it('updates cspCache with given csp', () => {
      const originalPolicy = cspCache.policy;
      updateCSP("default-src 'self';");

      expect(console.error).not.toHaveBeenCalled();
      expect(cspCache.policy).not.toEqual(originalPolicy);
      expect(cspCache.policy).toMatchSnapshot();
    });
  });

  describe('getCSP', () => {
    it('returns parsed CSP', () => {
      updateCSP("default-src 'none' 'self'; block-all-mixed-content");
      expect(getCSP()).toEqual({
        'default-src': ["'none'", "'self'"],
        'block-all-mixed-content': true,
      });
    });
  });
});
