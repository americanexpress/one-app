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
import fp from 'fastify-plugin';
import attachRequestSpies from '../utils/attachRequestSpies';

/*
TIMERS
`$RequestFullDuration` measures how long it took the whole request to be resolved
`$RequestOverhead` measures how long it took from when the request was made
                   until the route handler was called
`$RouteHandler` measures how long the route handler took to provide an output
`$ResponseBuilder` measures how long it took for fastify to build the response
                   after the payload/output from route handled was provided
Why symbols?
It prevents conflicts with existing keys, native or from other plugins
*/
export const $ExternalRequestDuration = Symbol('$ExternalRequestDuration');
export const $RequestFullDuration = Symbol('$RequestFullDuration');
export const $RequestOverhead = Symbol('$RequestOverhead');
export const $RouteHandler = Symbol('$RouteHandler');
export const $ResponseBuilder = Symbol('$ResponseBuilder');

const passThrough = ({ log }) => log;

const UTILS = {
  configureRequestLog: passThrough,
};

function formatProtocol(parsedUrl) {
  const { protocol } = parsedUrl;
  return protocol.replace(/:$/, '');
}

const getLocale = (req) => {
  // TODO: Verify if `store` is available
  if (req.store) {
    const state = req.store.getState();
    return state.getIn(['intl', 'activeLocale']);
  }

  return undefined;
};

const hrtimeToMs = (value) => (value[0] * 1e3) + (value[1] * 1e-6);

const startTimer = (obj, symbol) => {
  const time = process.hrtime();

  // eslint-disable-next-line no-param-reassign
  obj[symbol] = time;
};

const endTimer = (obj, symbol) => {
  const result = process.hrtime(obj[symbol]);
  const ms = hrtimeToMs(result);

  // eslint-disable-next-line no-param-reassign
  obj[symbol] = ms;

  return ms;
};

const buildMetaData = (request, reply) => {
  const { headers } = request;

  return {
    method: request.method,
    correlationId: headers['correlation-id'],
    // null to explicitly signal no value, undefined if not expected for every request
    host: headers.host || null,
    referrer: headers.referer || headers.referrer || null,
    userAgent: headers['user-agent'] || null,
    location: reply.getHeader('location') || undefined,
    forwarded: headers.forwarded || null,
    forwardedFor: headers['x-forwarded-for'] || null,
    locale: getLocale(request),
  };
};

const logClientRequest = (request, reply) => {
  const getTimer = (symbol) => request[symbol];
  const ttfb = getTimer($RequestFullDuration) - getTimer($ResponseBuilder);
  const log = {
    request: {
      direction: 'in',
      protocol: request.protocol,
      address: {
        uri: url.format({
          protocol: request.protocol,
          port: request.port,
          hostname: request.hostname,
          pathname: request.originalUrl,
        }),
      },
      metaData: buildMetaData(request, reply),
      timings: { // https://www.w3.org/TR/navigation-timing/
        duration: Math.round(getTimer($RequestFullDuration)),
        ttfb: ttfb >= 0 ? Math.round(ttfb) : null,
        requestOverhead: Math.round(getTimer($RequestOverhead)),
        routeHandler: Math.round(getTimer($RouteHandler)),
        responseBuilder: Math.round(getTimer($ResponseBuilder)),
      },
      statusCode: reply.statusCode,
      statusText: reply.raw.statusMessage || undefined,
    },
  };

  const configuredLog = UTILS.configureRequestLog({
    req: request,
    res: reply,
    log,
  });

  request.log.info(configuredLog);
};

export const setConfigureRequestLog = (newConfigureRequestLog = passThrough) => {
  UTILS.configureRequestLog = newConfigureRequestLog;
};

/**
 * Fastify Plugin to log requests
 * @param {import('fastify').FastifyInstance} fastify Fastify instance
 * @param {import('fastify').FastifyPluginOptions} opts plugin options
 */
const requestLogging = async (fastify, opts = {}) => {
  // decorators should be initialized per Fastify documentation
  // see https://www.fastify.io/docs/latest/Reference/Decorators/#decoratereplyname-value-dependencies
  fastify.decorateRequest($RequestOverhead, null);
  fastify.decorateRequest($RequestFullDuration, null);
  fastify.decorateRequest($RouteHandler, null);
  fastify.decorateRequest($ResponseBuilder, null);

  if (opts.spy === true) {
    fastify.addHook('onReady', async () => {
      function outgoingRequestSpy(externalRequest) {
        startTimer(externalRequest, $ExternalRequestDuration);
      }

      function outgoingRequestEndSpy(externalRequest, parsedUrl) {
        const { res } = externalRequest;
        const duration = endTimer(externalRequest, $ExternalRequestDuration);
        fastify.log.info({
          request: {
            direction: 'out',
            protocol: formatProtocol(parsedUrl),
            address: {
              uri: parsedUrl.href,
            },
            metaData: {
              method: externalRequest.method,
              // null to explicitly signal no value, undefined if not expected for every request
              correlationId: externalRequest.getHeader('correlation-id') || undefined,
            },
            timings: { duration },
            statusCode: (res && res.statusCode) || null,
            statusText: (res && res.statusMessage) || null,
          },
        });
      }
      attachRequestSpies(outgoingRequestSpy, outgoingRequestEndSpy);
    });
  }

  fastify.addHook('onRequest', async (request) => {
    startTimer(request, $RequestOverhead);
    startTimer(request, $RequestFullDuration);
  });

  fastify.addHook('preHandler', async (request) => {
    endTimer(request, $RequestOverhead);
    startTimer(request, $RouteHandler);
  });

  fastify.addHook('onSend', async (request, _reply, payload) => {
    endTimer(request, $RouteHandler);
    startTimer(request, $ResponseBuilder);

    // Note: `onSend` is meant to be used to modify the payload for the response.
    //        we use it to calculate TTFB (time to first byte) since it's called
    //        by fastify right before `writeHead` is called.
    return payload;
  });

  fastify.addHook('onResponse', async (request, reply) => {
    try {
      endTimer(request, $ResponseBuilder);
      // same as 'reply.getResponseTime()' but our approach
      // helps us to make the code cleaner
      endTimer(request, $RequestFullDuration);

      logClientRequest(request, reply);
    } catch (error) {
      request.log.error(error);
      throw error;
    }
  });
};

export default fp(requestLogging, {
  fastify: '4.x',
  name: 'requestLogging',
});
