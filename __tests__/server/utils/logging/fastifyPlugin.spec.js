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

import fastifyPlugin, {
  $RequestFullDuration,
  $RequestOverhead,
  $RouteHandler,
  $ResponseBuilder,
  setConfigureRequestLog,
} from '../../../../src/server/utils/logging/fastifyPlugin';
import logger from '../../../../src/server/utils/logging/logger';

jest.mock('../../../../src/server/utils/logging/logger');

describe('fastifyPlugin', () => {
  const { hrtime } = process;

  beforeEach(() => {
    jest.clearAllMocks();
    process.hrtime = jest.fn(() => [0, 1000]);
  });

  afterEach(() => {
    process.hrtime = hrtime;
  });

  it('adds the expected hooks and calls the done fn', () => {
    const fastify = {
      decorateRequest: jest.fn((name, fn) => {
        fastify[name] = fn;
      }),
      addHook: jest.fn(),
    };
    const done = jest.fn();

    fastifyPlugin(fastify, null, done);

    expect(fastify.addHook).toHaveBeenCalledTimes(4);
    expect(fastify.addHook).toHaveBeenCalledWith('onRequest', expect.any(Function));
    expect(fastify.addHook).toHaveBeenCalledWith('preHandler', expect.any(Function));
    expect(fastify.addHook).toHaveBeenCalledWith('onSend', expect.any(Function));
    expect(fastify.addHook).toHaveBeenCalledWith('onResponse', expect.any(Function));
  });

  describe('onRequest', () => {
    it('starts Request Overhead and Request Full Duration timers', async () => {
      const fastify = {
        decorateRequest: jest.fn((name, fn) => {
          fastify[name] = fn;
        }),
        addHook: jest.fn((name, fn) => {
          fastify[name] = fn;
        }),
      };

      fastifyPlugin(fastify, null, jest.fn());

      expect(process.hrtime).toHaveBeenCalledTimes(0);

      const request = {};

      await fastify.onRequest(request);

      expect(process.hrtime).toHaveBeenCalledTimes(2);
      expect(request).toEqual({
        [$RequestOverhead]: [0, 1000],
        [$RequestFullDuration]: [0, 1000],
      });
    });
  });

  describe('preHandler', () => {
    it('ends Request Overhead timer and starts Route Handler timer', async () => {
      const fastify = {
        decorateRequest: jest.fn((name, fn) => {
          fastify[name] = fn;
        }),
        addHook: jest.fn((name, fn) => {
          fastify[name] = fn;
        }),
      };

      fastifyPlugin(fastify, null, jest.fn());

      expect(process.hrtime).toHaveBeenCalledTimes(0);

      const request = {};

      await fastify.preHandler(request);

      expect(process.hrtime).toHaveBeenCalledTimes(2);
      expect(request).toEqual({
        [$RequestOverhead]: 0.001,
        [$RouteHandler]: [0, 1000],
      });
    });
  });

  describe('onSend', () => {
    it('ends Route Handler timer and starts Response Builder timer with unmodified payload', async () => {
      const fastify = {
        decorateRequest: jest.fn((name, fn) => {
          fastify[name] = fn;
        }),
        addHook: jest.fn((name, fn) => {
          fastify[name] = fn;
        }),
      };
      const payload = { intact: true };

      fastifyPlugin(fastify, null, jest.fn());

      expect(process.hrtime).toHaveBeenCalledTimes(0);

      const request = {};

      expect(await fastify.onSend(request, null, payload)).toEqual(payload);
      expect(process.hrtime).toHaveBeenCalledTimes(2);
      expect(request).toEqual({
        [$RouteHandler]: 0.001,
        [$ResponseBuilder]: [0, 1000],
      });
    });
  });

  describe('onResponse', () => {
    it('ends Response Builder timer and starts Request Full Duration timer', async () => {
      const fastify = {
        decorateRequest: jest.fn((name, fn) => {
          fastify[name] = fn;
        }),
        addHook: jest.fn((name, fn) => {
          fastify[name] = fn;
        }),
      };

      fastifyPlugin(fastify, null, jest.fn());

      expect(process.hrtime).toHaveBeenCalledTimes(0);

      const request = {
        headers: {},
      };
      const reply = {
        getHeader: jest.fn(),
        raw: {},
      };

      await fastify.onResponse(request, reply);

      expect(process.hrtime).toHaveBeenCalledTimes(2);
      expect(request).toEqual({
        headers: {},
        [$ResponseBuilder]: 0.001,
        [$RequestFullDuration]: 0.001,
      });
    });

    describe('logs the request', () => {
      afterEach(() => {
        setConfigureRequestLog(({ log }) => log);
      });

      it('no headers only fallbacks', async () => {
        const fastify = {
          decorateRequest: jest.fn((name, fn) => {
            fastify[name] = fn;
          }),
          addHook: jest.fn((name, fn) => {
            fastify[name] = fn;
          }),
        };

        fastifyPlugin(fastify, null, jest.fn());

        expect(process.hrtime).toHaveBeenCalledTimes(0);

        const request = {
          headers: {
          },
        };
        const reply = {
          getHeader: jest.fn(),
          raw: {},
        };

        await fastify.onRequest(request, reply);
        await fastify.preHandler(request, reply);
        await fastify.onSend(request, reply);
        await fastify.onResponse(request, reply);

        expect(logger.info).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith({
          type: 'request',
          request: {
            address: {
              uri: '',
            },
            direction: 'in',
            metaData: {
              correlationId: undefined,
              forwarded: null,
              forwardedFor: null,
              host: null,
              locale: undefined,
              location: undefined,
              method: undefined,
              referrer: null,
              userAgent: null,
            },
            protocol: undefined,
            statusCode: undefined,
            statusText: undefined,
            timings: {
              duration: 0,
              requestOverhead: 0,
              responseBuilder: 0,
              routeHandler: 0,
              ttfb: 0,
            },
          },
        });
      });

      it('all headers and request keys present', async () => {
        const fastify = {
          decorateRequest: jest.fn((name, fn) => {
            fastify[name] = fn;
          }),
          addHook: jest.fn((name, fn) => {
            fastify[name] = fn;
          }),
        };

        fastifyPlugin(fastify, null, jest.fn());

        expect(process.hrtime).toHaveBeenCalledTimes(0);

        const request = {
          headers: {
            'correlation-id': 123,
            host: 'localhost',
            referer: 'referer',
            'user-agent': 'chrome',
            forwarded: 'forwarded',
            'x-forwarded-for': 'x-forwarded-for',
          },
          protocol: 'https',
          port: 1234,
          hostname: 'amex.com',
          originalUrl: 'amex.com',
          method: 'GET',
        };
        const reply = {
          getHeader: jest.fn((header) => {
            switch (header) {
              case 'location': {
                return 'some-location';
              }
              default: {
                return null;
              }
            }
          }),
          raw: {
            statusMessage: 'Custom Message',
          },
          statusCode: 500,
        };

        await fastify.onRequest(request, reply);
        await fastify.preHandler(request, reply);
        await fastify.onSend(request, reply);
        await fastify.onResponse(request, reply);

        expect(logger.info).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith({
          type: 'request',
          request: {
            address: {
              uri: 'https://amex.com:1234/amex.com',
            },
            direction: 'in',
            metaData: {
              correlationId: 123,
              forwarded: 'forwarded',
              forwardedFor: 'x-forwarded-for',
              host: 'localhost',
              locale: undefined,
              location: 'some-location',
              method: 'GET',
              referrer: 'referer',
              userAgent: 'chrome',
            },
            protocol: 'https',
            statusCode: 500,
            statusText: 'Custom Message',
            timings: {
              duration: 0,
              requestOverhead: 0,
              responseBuilder: 0,
              routeHandler: 0,
              ttfb: 0,
            },
          },
        });
      });

      it('activeLocale in intl from store', async () => {
        const fastify = {
          decorateRequest: jest.fn((name, fn) => {
            fastify[name] = fn;
          }),
          addHook: jest.fn((name, fn) => {
            fastify[name] = fn;
          }),
        };

        fastifyPlugin(fastify, null, jest.fn());

        expect(process.hrtime).toHaveBeenCalledTimes(0);

        const request = {
          headers: {
          },
          store: {
            getState: () => ({
              getIn: () => 'us_en',
            }),
          },
        };
        const reply = {
          getHeader: jest.fn(),
          raw: {},
        };

        await fastify.onRequest(request, reply);
        await fastify.preHandler(request, reply);
        await fastify.onSend(request, reply);
        await fastify.onResponse(request, reply);

        expect(logger.info).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith({
          type: 'request',
          request: {
            address: {
              uri: '',
            },
            direction: 'in',
            metaData: {
              correlationId: undefined,
              forwarded: null,
              forwardedFor: null,
              host: null,
              locale: 'us_en',
              location: undefined,
              method: undefined,
              referrer: null,
              userAgent: null,
            },
            protocol: undefined,
            statusCode: undefined,
            statusText: undefined,
            timings: {
              duration: 0,
              requestOverhead: 0,
              responseBuilder: 0,
              routeHandler: 0,
              ttfb: 0,
            },
          },
        });
      });

      it('custom configureRequestLog', async () => {
        const fastify = {
          decorateRequest: jest.fn((name, fn) => {
            fastify[name] = fn;
          }),
          addHook: jest.fn((name, fn) => {
            fastify[name] = fn;
          }),
        };

        fastifyPlugin(fastify, null, jest.fn());

        const mutateLog = jest.fn(() => 'log changed');

        setConfigureRequestLog(mutateLog);

        const request = {
          headers: {
          },
        };
        const reply = {
          getHeader: jest.fn(),
          raw: {},
        };

        await fastify.onRequest(request, reply);
        await fastify.preHandler(request, reply);
        await fastify.onSend(request, reply);
        await fastify.onResponse(request, reply);

        expect(mutateLog).toHaveBeenCalledWith({
          req: request,
          res: reply,
          log: {
            request: {
              address: {
                uri: '',
              },
              direction: 'in',
              metaData: {
                correlationId: undefined,
                forwarded: null,
                forwardedFor: null,
                host: null,
                locale: undefined,
                location: undefined,
                method: undefined,
                referrer: null,
                userAgent: null,
              },
              protocol: undefined,
              statusCode: undefined,
              statusText: undefined,
              timings: {
                duration: 0,
                requestOverhead: 0,
                responseBuilder: 0,
                routeHandler: 0,
                ttfb: 0,
              },
            },
            type: 'request',
          },
        });
        expect(logger.info).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith('log changed');
      });

      it('negative ttfb', async () => {
        const fastify = {
          decorateRequest: jest.fn((name, fn) => {
            fastify[name] = fn;
          }),
          addHook: jest.fn((name, fn) => {
            fastify[name] = fn;
          }),
        };

        fastifyPlugin(fastify, null, jest.fn());

        const request = {
          headers: {
          },
        };
        const reply = {
          getHeader: jest.fn(),
          raw: {},
        };

        process.hrtime.mockImplementationOnce(() => [0, 200]);
        process.hrtime.mockImplementationOnce(() => [0, 100]);

        await fastify.onResponse(request, reply);

        expect(logger.info).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith({
          request: {
            address: {
              uri: '',
            },
            direction: 'in',
            metaData: {
              correlationId: undefined,
              forwarded: null,
              forwardedFor: null,
              host: null,
              locale: undefined,
              location: undefined,
              method: undefined,
              referrer: null,
              userAgent: null,
            },
            protocol: undefined,
            statusCode: undefined,
            statusText: undefined,
            timings: {
              duration: 0,
              requestOverhead: Number.NaN,
              responseBuilder: 0,
              routeHandler: Number.NaN,
              ttfb: null,
            },
          },
          type: 'request',
        });
      });
    });
  });
});
