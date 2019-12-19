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

import url from 'url';

import { monkeypatches } from '@americanexpress/lumberjack';

import { startTimer, measureTime } from './timing';
import logger from './logger';

const passThrough = ({ log }) => log;
const tenantUtils = {
  configureRequestLog: passThrough,
};

function getLocale(req) {
  if (req.store) {
    const state = req.store.getState();
    return state.getIn(['intl', 'activeLocale']);
  }
  return undefined;
}

function buildMetaData(req, res) {
  const { headers } = req;
  return {
    method: req.method,
    correlationId: headers['correlation-id'],
    // null to explicitly signal no value, undefined if not expected for every request
    host: headers.host || null,
    referrer: headers.referer || headers.referrer || null,
    userAgent: headers['user-agent'] || null,
    location: res.getHeader('location') || undefined,
    forwarded: headers.forwarded || null,
    forwardedFor: headers['x-forwarded-for'] || null,
    locale: getLocale(req),
  };
}

function logClientRequest(req, res) {
  const fullDuration = measureTime(req);
  const responseDuration = measureTime(res);
  const ttfb = fullDuration - responseDuration;
  const log = {
    type: 'request',
    request: {
      direction: 'in',
      protocol: req.protocol,
      address: {
        uri: url.format({
          protocol: req.protocol,
          port: req.port,
          hostname: req.hostname,
          pathname: req.originalUrl,
        }),
      },
      metaData: buildMetaData(req, res),
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
        duration: Math.round(fullDuration),
        ttfb: ttfb >= 0 ? Math.round(ttfb) : null,
      },
      statusCode: res.statusCode,
      statusText: res.statusMessage || undefined,
    },
  };

  const configuredLog = tenantUtils.configureRequestLog({ req, res, log });
  logger.info(configuredLog);
}

export const setConfigureRequestLog = (newConfigureRequestLog = passThrough) => {
  tenantUtils.configureRequestLog = newConfigureRequestLog;
};

export default function serverMiddleware(req, res, next) {
  startTimer(req);
  monkeypatches.attachSpy(res, 'writeHead', () => startTimer(res));
  res.on('finish', () => logClientRequest(req, res));
  res.on('close', () => logClientRequest(req, res)); // TODO: mention the different status?

  setImmediate(next);
}
