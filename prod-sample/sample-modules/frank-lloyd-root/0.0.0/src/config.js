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

import csp from './csp';
import createFrankLikeFetch from './createFrankLikeFetch';

export default {
  eventLoopDelayThreshold: Infinity,
  csp,
  corsOrigins: [/\.example.com$/],
  configureRequestLog: ({ req, log = {} }) => {
    const clonedLog = JSON.parse(JSON.stringify(log));
    const { cookies } = req;

    clonedLog.request.metaData = {
      userId: cookies ? cookies.userId || null : undefined,
      ...clonedLog.request.metaData,
    };

    return clonedLog;
  },
  provideStateConfig: {
    someApiUrl: {
      client: {
        development: 'https://internet-origin-dev.example.com/some-api/v1',
        qa: 'https://internet-origin-qa.example.com/some-api/v1',
        production: 'https://internet-origin.example.com/some-api/v1',
      },
      server: {
        development: 'https://intranet-origin-dev.example.com/some-api/v1',
        qa: 'https://intranet-origin-qa.example.com/some-api/v1',
        production: 'https://intranet-origin.example.com/some-api/v1',
      },
    },
    someBooleanValue: {
      client: true,
      server: true,
    },
  },
  extendSafeRequestRestrictedAttributes: {
    cookies: [
      'macadamia',
    ],
  },
  createSsrFetch: createFrankLikeFetch,
};
