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

import url from 'node:url';
import util from 'node:util';
import attachRequestSpies from '../../../src/server/utils/attachRequestSpies';
import requestLogging, {
  $ExternalRequestDuration,
  $RequestFullDuration,
  $RequestOverhead,
  $RouteHandler,
  $ResponseBuilder,
  setConfigureRequestLog,
} from '../../../src/server/plugins/requestLogging';

jest.mock('pino');
jest.mock('../../../src/server/utils/logging/logger');
jest.mock('../../../src/server/utils/attachRequestSpies');

jest.spyOn(console, 'error').mockImplementation(util.format);

describe('requestLogging', () => {
  jest.spyOn(process, 'hrtime').mockReturnValue([0, 1000]);
  let fastify;

  beforeEach(() => {
    jest.clearAllMocks();
    fastify = {
      log: { info: jest.fn() },
      decorateRequest: jest.fn((name, fn) => {
        fastify[name] = fn;
      }),
      addHook: jest.fn((name, fn) => {
        fastify[name] = fn;
      }),
    };
  });

  it('adds the expected hooks when spying is enabled', async () => {
    await requestLogging(fastify, { spy: true });

    expect(fastify.addHook).toHaveBeenCalledTimes(5);
    expect(fastify.addHook).toHaveBeenCalledWith('onReady', expect.any(Function));
    expect(fastify.addHook).toHaveBeenCalledWith('onRequest', expect.any(Function));
    expect(fastify.addHook).toHaveBeenCalledWith('preHandler', expect.any(Function));
    expect(fastify.addHook).toHaveBeenCalledWith('onSend', expect.any(Function));
    expect(fastify.addHook).toHaveBeenCalledWith('onResponse', expect.any(Function));
  });

  it('does not add the onReady hook when spying is not enabled', async () => {
    await requestLogging(fastify);

    expect(fastify.addHook).toHaveBeenCalledTimes(4);
    expect(fastify.addHook).not.toHaveBeenCalledWith('onReady', expect.any(Function));
    expect(fastify.addHook).toHaveBeenCalledWith('onRequest', expect.any(Function));
    expect(fastify.addHook).toHaveBeenCalledWith('preHandler', expect.any(Function));
    expect(fastify.addHook).toHaveBeenCalledWith('onSend', expect.any(Function));
    expect(fastify.addHook).toHaveBeenCalledWith('onResponse', expect.any(Function));
  });

  describe('onReady', () => {
    it('spies on requests', async () => {
      await requestLogging(fastify, { spy: true });
      await fastify.onReady();
      expect(attachRequestSpies).toHaveBeenCalledTimes(1);
    });

    describe('logging outgoing requests', () => {
      function createExternalRequestAndParsedUrl() {
        const externalRequestHeaders = {
          'correlation-id': '123',
          host: 'example.com',
          referer: 'https://example.com/other-place',
          'user-agent': 'Browser/8.0 (compatible; WXYZ 100.0; Doors LQ 81.4; Boat/1.0)',
        };
        const externalRequest = {
          method: 'GET',
          getHeader: jest.fn((name) => externalRequestHeaders[name]),
          res: {
            statusCode: 200,
            statusMessage: 'OK',
          },
        };
        const parsedUrl = url.parse('https://example.com/place');
        return { externalRequest, parsedUrl, externalRequestHeaders };
      }

      it('starts a timer when the request starts', async () => {
        const { externalRequest } = createExternalRequestAndParsedUrl();
        await requestLogging(fastify, { spy: true });
        await fastify.onReady();
        expect(attachRequestSpies).toHaveBeenCalledTimes(1);
        const outgoingRequestSpy = attachRequestSpies.mock.calls[0][0];
        outgoingRequestSpy(externalRequest);
        expect(externalRequest).toEqual(expect.objectContaining({
          [$ExternalRequestDuration]: [0, 1000],
        }));
      });

      it('is level info', async () => {
        const { externalRequest, parsedUrl } = createExternalRequestAndParsedUrl();
        await requestLogging(fastify, { spy: true });
        await fastify.onReady();
        expect(attachRequestSpies).toHaveBeenCalledTimes(1);
        const outgoingRequestEndSpy = attachRequestSpies.mock.calls[0][1];
        outgoingRequestEndSpy(externalRequest, parsedUrl);
        expect(fastify.log.info).toHaveBeenCalledTimes(1);
        expect(fastify.log.info.mock.calls[0]).toMatchSnapshot();
      });

      it('uses the correlation id header if present', async () => {
        const {
          externalRequest,
          externalRequestHeaders,
          parsedUrl,
        } = createExternalRequestAndParsedUrl();
        externalRequestHeaders['correlation-id'] = '1234';
        await requestLogging(fastify, { spy: true });
        await fastify.onReady();
        expect(attachRequestSpies).toHaveBeenCalledTimes(1);
        const outgoingRequestEndSpy = attachRequestSpies.mock.calls[0][1];
        outgoingRequestEndSpy(externalRequest, parsedUrl);
        expect(fastify.log.info).toHaveBeenCalledTimes(1);
        const entry = fastify.log.info.mock.calls[0][0];
        expect(entry.request.metaData).toHaveProperty('correlationId', '1234');
      });

      it('uses undefined for the correlation id header if not present', async () => {
        // TODO: add holocron API to edit the request so we can add tracing/correlationId headers
        const {
          externalRequest,
          externalRequestHeaders,
          parsedUrl,
        } = createExternalRequestAndParsedUrl();
        delete externalRequestHeaders['correlation-id'];
        await requestLogging(fastify, { spy: true });
        await fastify.onReady();
        expect(attachRequestSpies).toHaveBeenCalledTimes(1);
        const outgoingRequestEndSpy = attachRequestSpies.mock.calls[0][1];
        outgoingRequestEndSpy(externalRequest, parsedUrl);
        const entry = fastify.log.info.mock.calls[0][0];
        expect(entry.request.metaData).toHaveProperty('correlationId', undefined);
      });

      it('uses the status code if present', async () => {
        const { externalRequest, parsedUrl } = createExternalRequestAndParsedUrl();
        externalRequest.res.statusCode = 200;
        await requestLogging(fastify, { spy: true });
        await fastify.onReady();
        expect(attachRequestSpies).toHaveBeenCalledTimes(1);
        const outgoingRequestEndSpy = attachRequestSpies.mock.calls[0][1];
        outgoingRequestEndSpy(externalRequest, parsedUrl);
        const entry = fastify.log.info.mock.calls[0][0];
        expect(entry.request).toHaveProperty('statusCode', 200);
      });

      it('uses null for the status code if not present', async () => {
        const { externalRequest, parsedUrl } = createExternalRequestAndParsedUrl();
        delete externalRequest.res.statusCode;
        await requestLogging(fastify, { spy: true });
        await fastify.onReady();
        expect(attachRequestSpies).toHaveBeenCalledTimes(1);
        const outgoingRequestEndSpy = attachRequestSpies.mock.calls[0][1];
        outgoingRequestEndSpy(externalRequest, parsedUrl);
        const entry = fastify.log.info.mock.calls[0][0];
        expect(entry.request).toHaveProperty('statusCode', null);
      });

      it('uses the status text if present', async () => {
        const { externalRequest, parsedUrl } = createExternalRequestAndParsedUrl();
        externalRequest.res.statusMessage = 'OK';
        await requestLogging(fastify, { spy: true });
        await fastify.onReady();
        expect(attachRequestSpies).toHaveBeenCalledTimes(1);
        const outgoingRequestEndSpy = attachRequestSpies.mock.calls[0][1];
        outgoingRequestEndSpy(externalRequest, parsedUrl);
        const entry = fastify.log.info.mock.calls[0][0];
        expect(entry.request).toHaveProperty('statusText', 'OK');
      });

      it('uses null for the status text if not present', async () => {
        const { externalRequest, parsedUrl } = createExternalRequestAndParsedUrl();
        delete externalRequest.res.statusMessage;
        await requestLogging(fastify, { spy: true });
        await fastify.onReady();
        expect(attachRequestSpies).toHaveBeenCalledTimes(1);
        const outgoingRequestEndSpy = attachRequestSpies.mock.calls[0][1];
        outgoingRequestEndSpy(externalRequest, parsedUrl);
        const entry = fastify.log.info.mock.calls[0][0];
        expect(entry.request).toHaveProperty('statusText', null);
      });
    });
  });

  describe('onRequest', () => {
    it('starts Request Overhead and Request Full Duration timers', async () => {
      await requestLogging(fastify);

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
      await requestLogging(fastify);

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
      const payload = { intact: true };

      await requestLogging(fastify);

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
      await requestLogging(fastify);

      expect(process.hrtime).toHaveBeenCalledTimes(0);

      const request = {
        headers: {},
        log: { info: jest.fn() },
      };
      const reply = {
        getHeader: jest.fn(),
        raw: {},
      };

      await fastify.onResponse(request, reply);

      expect(process.hrtime).toHaveBeenCalledTimes(2);
      expect(request).toEqual({
        headers: {},
        log: request.log,
        [$ResponseBuilder]: 0.001,
        [$RequestFullDuration]: 0.001,
      });
    });

    describe('logs the request', () => {
      afterEach(() => {
        setConfigureRequestLog(({ log }) => log);
      });

      it('no headers only fallbacks', async () => {
        await requestLogging(fastify);

        expect(process.hrtime).toHaveBeenCalledTimes(0);

        const request = {
          headers: {},
          log: {
            error: jest.fn(),
            info: jest.fn(),
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

        expect(request.log.info).toHaveBeenCalledTimes(1);
        expect(request.log.info).toHaveBeenCalledWith({
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
        await requestLogging(fastify);

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
          log: { info: jest.fn() },
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

        expect(request.log.info).toHaveBeenCalledTimes(1);
        expect(request.log.info).toHaveBeenCalledWith({
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
        await requestLogging(fastify);

        expect(process.hrtime).toHaveBeenCalledTimes(0);

        const request = {
          headers: {},
          store: {
            getState: () => ({
              getIn: () => 'us_en',
            }),
          },
          log: { info: jest.fn() },
        };
        const reply = {
          getHeader: jest.fn(),
          raw: {},
        };

        await fastify.onRequest(request, reply);
        await fastify.preHandler(request, reply);
        await fastify.onSend(request, reply);
        await fastify.onResponse(request, reply);

        expect(request.log.info).toHaveBeenCalledTimes(1);
        expect(request.log.info).toHaveBeenCalledWith({
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
        await requestLogging(fastify);

        const mutateLog = jest.fn(() => 'log changed');

        setConfigureRequestLog(mutateLog);

        const request = {
          headers: {},
          raw: 'raw-request',
          log: { info: jest.fn() },
        };
        const reply = {
          getHeader: jest.fn(),
          raw: 'raw-response',
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
          },
        });
        expect(request.log.info).toHaveBeenCalledTimes(1);
        expect(request.log.info).toHaveBeenCalledWith('log changed');
      });

      it('negative ttfb', async () => {
        await requestLogging(fastify);

        const request = {
          headers: {},
          log: { info: jest.fn() },
        };
        const reply = {
          getHeader: jest.fn(),
          raw: {},
        };

        process.hrtime.mockImplementationOnce(() => [0, 200]);
        process.hrtime.mockImplementationOnce(() => [0, 100]);

        await fastify.onResponse(request, reply);

        expect(request.log.info).toHaveBeenCalledTimes(1);
        expect(request.log.info).toHaveBeenCalledWith({
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
        });
      });
    });

    it('catches and logs errors', async () => {
      const request = {
        headers: {},
        log: { error: jest.fn() },
      };
      const reply = {
        getHeader: jest.fn(),
        raw: {},
      };

      await requestLogging(fastify);
      const boomError = new Error('boom');
      setConfigureRequestLog(() => {
        throw boomError;
      });
      await expect(() => fastify.onResponse(request, reply)).rejects.toEqual(boomError);
      expect(request.log.error).toHaveBeenCalledWith(boomError);
    });
  });

  describe('setConfigureRequestLog', () => {
    it('resets to default', async () => {
      const request = {
        log: { info: jest.fn() },
        headers: {},
      };
      const reply = {
        getHeader: jest.fn(),
        raw: {},
      };

      await requestLogging(fastify);
      setConfigureRequestLog(() => {
        throw new Error('shh');
      });
      setConfigureRequestLog();

      await fastify.onResponse(request, reply);

      expect(request.log.info.mock.calls[0][0]).toMatchInlineSnapshot(`
        {
          "request": {
            "address": {
              "uri": "",
            },
            "direction": "in",
            "metaData": {
              "correlationId": undefined,
              "forwarded": null,
              "forwardedFor": null,
              "host": null,
              "locale": undefined,
              "location": undefined,
              "method": undefined,
              "referrer": null,
              "userAgent": null,
            },
            "protocol": undefined,
            "statusCode": undefined,
            "statusText": undefined,
            "timings": {
              "duration": 0,
              "requestOverhead": NaN,
              "responseBuilder": 0,
              "routeHandler": NaN,
              "ttfb": 0,
            },
          },
        }
      `);
    });
  });
});
