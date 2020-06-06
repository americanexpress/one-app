/*
 * Copyright 2020 American Express Travel Related Services Company, Inc.
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
import pwa from './pwa';
import createFrankLikeFetch from './createFrankLikeFetch';

const remoteCdnUrl = process.env.SURGE_DOMAIN || '';
const clientCdnUrl = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3001/static/'
  : 'https://sample-cdn.frank/';
const themeColor = '#FDB92D';
const description = 'A Progressive Web App ready Holocron Module';

export default {
  csp,
  pwa,
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
    // by providing various web manifest values as config, they can both be used by
    // the webManifest fn and the root module rendered content and achieve parity.
    // For the root module, having the meta and links improves the browsing experience
    // and can be used as fallback meta data where the webManifest is not supported.
    description: {
      server: description,
      client: description,
    },
    themeColor: {
      server: themeColor,
      client: themeColor,
    },
    clientCdnUrl: {
      server: clientCdnUrl,
      client: clientCdnUrl,
    },
    remoteCdnUrl: {
      server: remoteCdnUrl,
      client: remoteCdnUrl,
    },
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
