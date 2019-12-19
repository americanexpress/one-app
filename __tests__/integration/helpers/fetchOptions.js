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

const https = require('https');
const HttpsProxyAgent = require('https-proxy-agent');

const createFetchOptions = ({ targetRemoteAppInstance } = {}) => ({
  ...!targetRemoteAppInstance && {
    // bc of self signed cert issue that should only exist if testing against localhost
    agent: new https.Agent({
      rejectUnauthorized: false,
    }),
  },
  ...targetRemoteAppInstance && process.env.HTTPS_PROXY && {
    agent: new HttpsProxyAgent(process.env.HTTPS_PROXY),
  },
});

module.exports = createFetchOptions;
