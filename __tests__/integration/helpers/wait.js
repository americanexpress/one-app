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

const fetch = require('cross-fetch');
const https = require('https');

const waitFor = (ms) => new Promise((res) => setTimeout(res, ms));

const waitUntilServerIsUp = async (url, timeoutInMs = 15000) => {
  let count = 0;

  const makeRequest = async (requestUrl, timeout) => {
    let response;
    try {
      // bc of self signed cert we use for one app local dev
      const options = requestUrl.startsWith('https') ? { agent: new https.Agent({ rejectUnauthorized: false }) } : {};
      response = await fetch(requestUrl, options);
    } catch (error) {
      // do nothing but continue on to next loop
    }

    count += 1;
    if (response && response.status && response.status === 200) {
      return;
    }

    await waitFor(200);
    // increments every 200ms so divide timeout by count to get the total number of counts
    const maxCount = timeout / 200;
    if (count >= maxCount) {
      throw new Error(`${requestUrl} not resolving with a 200 status code within ${timeout}ms`);
    }

    // eslint-disable-next-line consistent-return
    return makeRequest(requestUrl, timeout);
  };

  return makeRequest(url, timeoutInMs);
};

module.exports = {
  waitFor,
  waitUntilServerIsUp,
};
