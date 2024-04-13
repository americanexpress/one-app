/*
 * Copyright 2024 American Express Travel Related Services Company, Inc.
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

import crypto from 'k6/crypto';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export default function createSummaryHandler(type, options) {
  return function handleSummary(data) {
    return {
      'summary.json': JSON.stringify(Object.assign(data, {
        meta: {
          type,
          hash: crypto.sha256(JSON.stringify(options), 'hex'),
          options,
          timestamp: new Date().toISOString(),
        },
      }), null, 2),
      stdout: textSummary(data, { enableColors: true }),
    };
  };
}
