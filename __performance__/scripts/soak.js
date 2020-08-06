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
    { duration: '10m', target: 100 }, // simulate ramp-up of traffic from 1 to 100 users over 10 minutes
    { duration: '12h', target: 100 }, // stay at 100 users for 12 hours
    { duration: '10m', target: 0 }, // ramp-down to 0 users over 10 minutes
  ],
  thresholds: {
    http_req_duration: ['p(99)<3000'], // 99% of requests must complete below 3s
  },
};

// eslint-disable-next-line no-undef
const { TARGET_URL } = __ENV;


export default function virtualUser() {
  const response = http.get(TARGET_URL);
  check(response, { 'status is 200': (resp) => resp.status === 200 });
  // limit vu to 1 RPS
  sleep(1);
}
