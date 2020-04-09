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

import contentSecurityPolicyBuilder from 'content-security-policy-builder';
import ip from 'ip';

export default contentSecurityPolicyBuilder({
  directives: {
    reportUri: process.env.ONE_CLIENT_CSP_REPORTING_URL,
    defaultSrc: [
      "'self'",
    ],
    scriptSrc: [
      "'self'",
      // used by integration tests running in docker where domain names are aliased
      'https://sample-cdn.frank',
      // used for our sample app deployment in heroku
      '*.surge.sh',
      // used for local development
      `${ip.address()}:3001`,
      // used for local development
      'localhost:3001',
    ],
    imgSrc: [
      "'self'",
      // used by integration tests running in docker
      'https://sample-cdn.frank',
      // used for our sample app deployment in heroku
      '*.surge.sh',
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
    ],
    connectSrc: [
      "'self'",
      '*.api.frank',
      // used for local development
      `${ip.address()}:3001`,
      // used for local development
      'localhost:3001',
      // used by integration tests running in docker where domain names are aliased
      'https://sample-cdn.frank',
      // used for our sample app deployment in heroku
      '*.surge.sh',
    ],
  },
});
