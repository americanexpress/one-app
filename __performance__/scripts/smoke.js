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

/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-unresolved */
import http from 'k6/http';
import { check, sleep } from 'k6';

// This is a simple smoke test to ensure there is no major regression
// to the one-app server.

export const options = {
  vus: 1, // 1 user looping for 1 minute
  duration: '1m',

  thresholds: {
    // 99% of requests must complete below 20ms.
    http_req_duration: [{ threshold: 'p(99)<20', abortOnFail: true }],
  },
};

// eslint-disable-next-line no-undef
const { TARGET_URL } = __ENV;

export default function virtualUser() {
  const response = http.get(TARGET_URL);
  // every vu request must return 200
  check(response, { 'status is 200': (resp) => resp.status === 200 });
  sleep(1);
}
