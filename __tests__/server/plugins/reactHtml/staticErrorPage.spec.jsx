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

import util from 'node:util';
import Fastify from 'fastify';
import staticErrorPage, {
  setErrorPage,
} from '../../../../src/server/plugins/reactHtml/staticErrorPage';

jest.mock('@americanexpress/fetch-enhancers', () => ({
  createTimeoutFetch: jest.fn(
    (timeout) => (next) => (url) => next(url)
      .then((res) => {
        res.timeout = timeout;
        return res;
      })
  ),
}));

jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(util.format);

describe('staticErrorPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends default static error page', async () => {
    const app = Fastify();

    app.get('/', (request, reply) => staticErrorPage(request, reply));

    const response = await app.inject({
      method: 'get',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('<!DOCTYPE html>');
    expect(response.body).toContain('<meta name="application-name" content="one-app">');
  });

  it('returns message as json', async () => {
    const app = Fastify();

    app.get('/', (request, reply) => {
      request.headers['content-type'] = 'application/json';

      staticErrorPage(request, reply);
    });

    const response = await app.inject({
      method: 'get',
      url: '/',
    });

    expect(console.error).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(await response.json()).toEqual({ message: 'Sorry, we are unable to load this page at this time. Please try again later.' });
  });

  it('does not change the status code if already set', async () => {
    const app = Fastify();

    app.get('/', (request, reply) => {
      reply.code(400);

      staticErrorPage(request, reply);
    });

    const response = await app.inject({
      method: 'get',
      url: '/',
    });

    expect(response.statusCode).toBe(400);
  });

  it('invites the user to try again if the status code is 5xx level', async () => {
    const app = Fastify();

    app.get('/', (request, reply) => {
      staticErrorPage(request, reply);
    });

    const response = await app.inject({
      method: 'get',
      url: '/',
    });

    expect(response.body).toContain('Sorry, we are unable to load this page at this time. Please try again later.');
  });

  it('invites the user to try again if the status code is 404', async () => {
    const app = Fastify();

    app.get('/', (request, reply) => {
      reply.code(404);
      staticErrorPage(request, reply);
    });

    const response = await app.inject({
      method: 'get',
      url: '/',
    });

    expect(response.body).toContain('Sorry, we are unable to load this page at this time. Please try again later.');
  });

  it('does not invite the user to try again if the status code is 4xx level and not 404', async () => {
    const app = Fastify();

    app.get('/', (request, reply) => {
      reply.code(400);
      staticErrorPage(request, reply);
    });

    const response = await app.inject({
      method: 'get',
      url: '/',
    });

    expect(response.body).toContain('Sorry, we are unable to load this page at this time.');
    expect(response.body).not.toContain('Please try again later.');
  });

  it('does not send any serializations of non-strings', async () => {
    const app = Fastify();

    app.get('/', (request, reply) => {
      reply.code(400);
      staticErrorPage(request, reply);
    });

    const response = await app.inject({
      method: 'get',
      url: '/',
    });

    expect(response.body).toContain('<!DOCTYPE html>');
    expect(response.body).not.toMatch('[object ');
    expect(response.body).not.toContain('undefined');
  });

  it('returns default error page if fetching custom error page url fails', async () => {
    const errorPageUrl = 'https://example.com';
    const fetchError = new Error('getaddrinfo ENOTFOUND');
    global.fetch = jest.fn(() => Promise.reject(fetchError));

    await setErrorPage(errorPageUrl);

    const app = Fastify();

    app.get('/', (request, reply) => {
      reply.code(400);
      staticErrorPage(request, reply);
    });

    const response = await app.inject({
      method: 'get',
      url: '/',
    });

    expect(response.body).toContain('<!DOCTYPE html>');
    expect(response.body).toContain('<meta name="application-name" content="one-app">');
  });

  it('uses the default error page if custom error page does not 200', async () => {
    const errorPageUrl = 'https://example.com';
    const statusCode = 500;

    global.fetch = jest.fn(() => Promise.resolve({
      headers: new global.Headers({
        'Content-Type': 'text/html',
      }),
      status: statusCode,
    }));

    await setErrorPage(errorPageUrl);

    const app = Fastify();

    app.get('/', (request, reply) => {
      reply.code(statusCode);
      staticErrorPage(request, reply);
    });

    const response = await app.inject({
      method: 'get',
      url: '/',
    });

    const data = await global.fetch.mock.results[0].value;

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(errorPageUrl);
    expect(await data.timeout).toBe(6000);
    expect(console.warn.mock.results[0].value).toBe('Failed to fetch custom error page with status: 500');
    expect(response.body).toContain('<!DOCTYPE html>');
    expect(response.body).toContain('<meta name="application-name" content="one-app">');
    expect(response.body).toContain('Sorry, we are unable to load this page at this time. Please try again later.');
  });

  it('returns a custom error page if provided', async () => {
    const errorPageUrl = 'https://example.com';
    const mockResponse = `<!doctype html>
    <html>
    <head>
    <title>Custom Error Page</title>
    <meta charset="utf-8" />
    <meta http-equiv="Content-type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
    <div>
        <h1>Custom Error Page</h1>
        <p>This is a custom error page.</p>
    </div>
    </body>
    </html>`;

    global.fetch = jest.fn(() => Promise.resolve({
      text: () => Promise.resolve(mockResponse),
      headers: new global.Headers({
        'Content-Type': 'text/html',
      }),
      status: 200,
    }));

    await setErrorPage(errorPageUrl);

    const app = Fastify();

    app.get('/', (request, reply) => {
      reply.code(200);
      staticErrorPage(request, reply);
    });

    const response = await app.inject({
      method: 'get',
      url: '/',
    });

    const data = await global.fetch.mock.results[0].value;

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(errorPageUrl);
    expect(await data.text()).toBe(mockResponse);
    expect(await data.timeout).toBe(6000);
    expect(response.body).toContain('<!doctype html>');
    expect(response.body).toContain('<h1>Custom Error Page</h1>');
  });
});

describe('setErrorPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const errorPageUrl = 'https://example.com';
  const mockResponse = `<!doctype html>
<html>
<head>
<title>Custom Error Page</title>
<meta charset="utf-8" />
<meta http-equiv="Content-type" content="text/html; charset=utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
<div>
    <h1>Custom Error Page</h1>
    <p>This is a custom error page.</p>
</div>
</body>
</html>`;

  it('fetches errorPageUrl', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      text: () => Promise.resolve(mockResponse),
      headers: new global.Headers({
        'Content-Type': 'text/html',
      }),
      status: 200,
    }));

    setErrorPage(errorPageUrl);

    const data = await global.fetch.mock.results[0].value;

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(errorPageUrl);
    expect(await data.text()).toBe(mockResponse);
    expect(await data.timeout).toBe(6000);
  });

  it('warns if content-type is not text/html', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      text: () => Promise.resolve(mockResponse),
      headers: new global.Headers({
        'Content-Type': 'text/plain',
      }),
      status: 200,
    }));

    await setErrorPage(errorPageUrl);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith('[appConfig/errorPageUrl] Content-Type was not of type text/html and may not render correctly');
  });

  it('warns if url cannot be fetched', async () => {
    const fetchError = new Error('getaddrinfo ENOTFOUND');
    global.fetch = jest.fn(() => Promise.reject(fetchError));

    await setErrorPage(errorPageUrl);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith('Could not fetch the URL', fetchError);
  });

  it('warns if content-length is greater than 244Kb', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      text: () => Promise.resolve(mockResponse),
      headers: new global.Headers({
        'Content-Type': 'text/html',
        'Content-Length': 750000,
      }),
      status: 200,
    }));

    await setErrorPage(errorPageUrl);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith('[appConfig/errorPageUrl] Content-Length is over 244Kb and may have an impact on performance');
  });
});
