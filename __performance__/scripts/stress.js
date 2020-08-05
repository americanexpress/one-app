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

/* eslint-disable import/no-unresolved */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // below normal load
    { duration: '5m', target: 100 },
    { duration: '2m', target: 300 }, // normal load
    { duration: '5m', target: 300 },
    { duration: '2m', target: 400 }, // around the breaking point
    { duration: '5m', target: 400 },
    { duration: '2m', target: 500 }, // beyond the breaking point
    { duration: '5m', target: 500 },
    { duration: '10m', target: 0 }, // scale down. Recovery stage.
  ],
  thresholds: {
    http_req_duration: ['p(99)<3000'], // 99% of requests must complete below 1s
  },
};


// eslint-disable-next-line no-undef
const { TARGET_BASE_URL } = __ENV;

export default function virtualUser() {
  const responses = http.batch([
    [
      'GET',
      `${TARGET_BASE_URL}/success`,
      null,
      { tags: { name: 'success' } },
    ],
    [
      'GET',
      `${TARGET_BASE_URL}/healthy-frank`,
      null,
      { tags: { name: 'healthy frank' } },
    ],
    [
      'GET',
      `${TARGET_BASE_URL}/demo/ssr-frank`,
      null,
      { tags: { name: 'ssr frank' } },
    ],
    [
      'GET',
      `${TARGET_BASE_URL}/demo/needy-frank?api=https://fast.api.frank/posts`,
      null,
      { tags: { name: 'frank with fast api req' } },
    ],
    [
      'GET',
      `${TARGET_BASE_URL}/demo/needy-frank?api=https://slow.api.frank/posts`,
      null,
      { tags: { name: 'frank api req with timeout' } },
    ],
  ]);

  check(responses[0], {
    'main page status was 200': (res) => res.status === 200,
  });

  sleep(1);
}
