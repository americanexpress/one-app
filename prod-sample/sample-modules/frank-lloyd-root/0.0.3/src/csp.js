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

import contentSecurityPolicyBuilder from 'content-security-policy-builder';
import { getIp } from './getIP';

export default contentSecurityPolicyBuilder({
  directives: {
    reportUri: process.env.ONE_CLIENT_CSP_REPORTING_URL,
    defaultSrc: [
      "'self'",
    ],
    workerSrc: [
      "'self'",
    ],
    manifestSrc: [
      "'self'",
      'https://sample-cdn.frank',
      `${getIp()}:3001`,
      'localhost:3001',
    ],
    scriptSrc: [
      "'self'",
      // used by integration tests running in docker where domain names are aliased
      'https://sample-cdn.frank',
      // used for our sample app deployment in heroku
      'https://one-app-statics.surge.sh',
      // used for local development
      `${getIp()}:3001`,
      // used for local development
      'localhost:3001',
    ],
    imgSrc: [
      "'self'",
      // used by integration tests running in docker
      'https://sample-cdn.frank',
      // used for our sample app deployment in heroku
      'https://one-app-statics.surge.sh',
      // used for local development for assets/-icons
      'localhost:3001',
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
    ],
    connectSrc: [
      "'self'",
      '*.api.frank',
      // used for local development
      `${getIp()}:3001`,
      // used for local development
      'localhost:3001',
      // used by integration tests running in docker where domain names are aliased
      'https://sample-cdn.frank',
      // used for our sample app deployment in heroku
      'https://one-app-statics.surge.sh',
      // used by needy frank 0.0.1
      'reqres.in',
    ],
  },
});
