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

import { monkeypatches } from '@americanexpress/lumberjack';

import lumberjackLogger from './logger';
import { replaceGlobalConsoleWithOtelLogger } from './otel/logger';
import { startTimer, measureTime } from './timing';

const COLON_AT_THE_END_REGEXP = /:$/;
function formatProtocol(parsedUrl) {
  const { protocol } = parsedUrl;
  return protocol.replace(COLON_AT_THE_END_REGEXP, '');
}

let logger;

if (process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT) {
  logger = replaceGlobalConsoleWithOtelLogger();
} else {
  logger = lumberjackLogger;
  monkeypatches.replaceGlobalConsole(logger);
}

function outgoingRequestSpy(externalRequest) {
  startTimer(externalRequest);
}

function outgoingRequestEndSpy(externalRequest, parsedUrl) {
  const { res } = externalRequest;
  const duration = Math.round(measureTime(externalRequest));
  logger.info({
    type: 'request',
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
        duration,
      },
      statusCode: (res && res.statusCode) || null,
      statusText: (res && res.statusMessage) || null,
    },
  });
}

// In Node.js v8 and earlier https.request internally called http.request, but this is changed in
// later versions
// https://github.com/nodejs/node/blob/v6.x/lib/https.js#L206
// https://github.com/nodejs/node/blob/v8.x/lib/https.js#L239
// https://github.com/nodejs/node/blob/v10.x/lib/https.js#L271
if (Number.parseInt(/^v(\d+)/.exec(process.version)[1], 10) > 8) {
  monkeypatches.attachHttpsRequestSpy(outgoingRequestSpy, outgoingRequestEndSpy);
}
monkeypatches.attachHttpRequestSpy(outgoingRequestSpy, outgoingRequestEndSpy);
