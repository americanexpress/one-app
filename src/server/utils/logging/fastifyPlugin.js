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

import url from 'url';
import fp from 'fastify-plugin';

import logger from './logger';

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
export const $RequestFullDuration = Symbol('$RequestFullDuration');
export const $RequestOverhead = Symbol('$RequestOverhead');
export const $RouteHandler = Symbol('$RouteHandler');
export const $ResponseBuilder = Symbol('$ResponseBuilder');

const UTILS = {
  configureRequestLog: ({ log }) => log,
};

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
    type: 'request',
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
        // navigationStart: 0,
        // redirectStart: 0,
        // redirectEnd: 0,
        // fetchStart: 0,
        // domainLookupStart: 10,
        // domainLookupEnd: 20,
        // connectStart: 30,
        // secureConnectionStart: 40,
        // connectEnd: 50,
        // requestStart: 60,
        // requestEnd: 70, // optional? not part of the W3C spec
        // responseStart: 80,
        // responseEnd: 90,
        // FIXME: mimic the w3 timing names
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
    req: request.raw,
    res: reply.raw,
    log,
  });

  logger.info(configuredLog);
};

export const setConfigureRequestLog = (newConfigureRequestLog) => {
  UTILS.configureRequestLog = newConfigureRequestLog;
};

const fastifyPlugin = (fastify, _opts, done) => {
  // decorators should be initialized per Fastify documentation
  // see https://www.fastify.io/docs/latest/Reference/Decorators/#decoratereplyname-value-dependencies
  fastify.decorateRequest($RequestOverhead, null);
  fastify.decorateRequest($RequestFullDuration, null);
  fastify.decorateRequest($RouteHandler, null);
  fastify.decorateRequest($ResponseBuilder, null);

  // NOTE: this is needed for backward compatibility since
  //       we were exposing the 'req' and 'res' from ExpressJS
  //       to the App Config.
  fastify.addHook('onRequest', async (request, reply) => {
    request.raw.originalUrl = request.raw.url;
    request.raw.id = request.id;
    request.raw.hostname = request.hostname;
    request.raw.ip = request.ip;
    request.raw.ips = request.ips;
    request.raw.log = request.log;
    // eslint-disable-next-line no-param-reassign
    reply.raw.log = request.log;

    // backward compatibility for body-parser
    if (request.body) {
      request.raw.body = request.body;
    }
    // backward compatibility for cookie-parser
    if (request.cookies) {
      request.raw.cookies = request.cookies;
    }

    // Make it lazy as it does a bit of work
    Object.defineProperty(request.raw, 'protocol', {
      get() {
        return request.protocol;
      },
    });
  });

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
    endTimer(request, $ResponseBuilder);
    // same as 'reply.getResponseTime()' but our approach
    // helps us to make the code cleaner
    endTimer(request, $RequestFullDuration);

    logClientRequest(request, reply);
  });

  done();
};

export default fp(fastifyPlugin, {
  fastify: '4.x',
  name: 'logging',
});
