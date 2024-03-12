/*
 * Copyright 2024 American Express Travel Related Services Company, Inc.
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

import requestRaw from '../../../src/server/plugins/requestRaw';

jest.mock('pino');
jest.mock('../../../src/server/utils/logging/logger');

describe('fastifyPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds the expected hooks and calls the done fn', () => {
    const fastify = {
      decorateRequest: jest.fn((name, fn) => {
        fastify[name] = fn;
      }),
      addHook: jest.fn(),
    };
    const done = jest.fn();

    requestRaw(fastify, null, done);

    expect(fastify.addHook).toHaveBeenCalledTimes(1);
    expect(fastify.addHook).toHaveBeenCalledWith('onRequest', expect.any(Function));
  });

  describe('onRequest', () => {
    it('mutates the raw request and reply to make it compatible with express-like objects', async () => {
      const fastify = {
        decorateRequest: jest.fn((name, fn) => {
          fastify[name] = fn;
        }),
        addHook: jest.fn((name, fn) => {
          if (!fastify[name]) {
            fastify[name] = fn;
          }
        }),
      };

      requestRaw(fastify, null, jest.fn());

      const request = {
        raw: {
          url: '/testing',
        },
        id: 123,
        hostname: 'unit-testing',
        ip: '127.0.0.1',
        ips: [],
        log: 'nothing',
      };
      const reply = {
        raw: {},
      };

      await fastify.onRequest(request, reply);

      expect(request).toEqual({
        hostname: 'unit-testing',
        id: 123,
        ip: '127.0.0.1',
        ips: [],
        log: 'nothing',
        raw: {
          hostname: 'unit-testing',
          id: 123,
          ip: '127.0.0.1',
          ips: [],
          log: 'nothing',
          originalUrl: '/testing',
          url: '/testing',
        },
      });
      expect(reply).toEqual({ raw: { log: 'nothing' } });
    });

    it('injects the body into raw', async () => {
      const fastify = {
        decorateRequest: jest.fn((name, fn) => {
          fastify[name] = fn;
        }),
        addHook: jest.fn((name, fn) => {
          if (!fastify[name]) {
            fastify[name] = fn;
          }
        }),
      };

      requestRaw(fastify, null, jest.fn());

      const request = {
        raw: {
          url: '/testing',
        },
        id: 123,
        hostname: 'unit-testing',
        ip: '127.0.0.1',
        ips: [],
        log: 'nothing',
        body: {
          testing: {
            something: true,
          },
        },
      };
      const reply = {
        raw: {},
      };

      await fastify.onRequest(request, reply);

      expect(request).toEqual({
        hostname: 'unit-testing',
        id: 123,
        ip: '127.0.0.1',
        ips: [],
        log: 'nothing',
        body: {
          testing: {
            something: true,
          },
        },
        raw: {
          hostname: 'unit-testing',
          id: 123,
          ip: '127.0.0.1',
          ips: [],
          log: 'nothing',
          originalUrl: '/testing',
          url: '/testing',
          body: {
            testing: {
              something: true,
            },
          },
        },
      });
    });

    it('injects the cookies into raw', async () => {
      const fastify = {
        decorateRequest: jest.fn((name, fn) => {
          fastify[name] = fn;
        }),
        addHook: jest.fn((name, fn) => {
          if (!fastify[name]) {
            fastify[name] = fn;
          }
        }),
      };

      requestRaw(fastify, null, jest.fn());

      const request = {
        raw: {
          url: '/testing',
        },
        id: 123,
        hostname: 'unit-testing',
        ip: '127.0.0.1',
        ips: [],
        log: 'nothing',
        cookies: 'with milk',
      };
      const reply = {
        raw: {},
      };

      await fastify.onRequest(request, reply);

      expect(request).toEqual({
        hostname: 'unit-testing',
        id: 123,
        ip: '127.0.0.1',
        ips: [],
        log: 'nothing',
        cookies: 'with milk',
        raw: {
          hostname: 'unit-testing',
          id: 123,
          ip: '127.0.0.1',
          ips: [],
          log: 'nothing',
          originalUrl: '/testing',
          url: '/testing',
          cookies: 'with milk',
        },
      });
    });

    it('injects the protocol into raw', async () => {
      const fastify = {
        decorateRequest: jest.fn((name, fn) => {
          fastify[name] = fn;
        }),
        addHook: jest.fn((name, fn) => {
          if (!fastify[name]) {
            fastify[name] = fn;
          }
        }),
      };

      requestRaw(fastify, null, jest.fn());

      const request = {
        raw: {
          url: '/testing',
        },
        id: 123,
        hostname: 'unit-testing',
        ip: '127.0.0.1',
        ips: [],
        log: 'nothing',
        protocol: 'http',
      };
      const reply = {
        raw: {},
      };

      await fastify.onRequest(request, reply);

      expect(request).toEqual({
        hostname: 'unit-testing',
        id: 123,
        ip: '127.0.0.1',
        ips: [],
        log: 'nothing',
        protocol: 'http',
        raw: {
          hostname: 'unit-testing',
          id: 123,
          ip: '127.0.0.1',
          ips: [],
          log: 'nothing',
          originalUrl: '/testing',
          url: '/testing',
        },
      });
      expect(request.raw.protocol).toBeDefined();
    });
  });
});
