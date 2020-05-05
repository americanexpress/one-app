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

import { getServerPWAConfig } from './config';

export default function serviceWorkerMiddleware() {
  return function serviceWorkerMiddlewareHandler(req, res, next) {
    const { serviceWorker, serviceWorkerScope, serviceWorkerScript } = getServerPWAConfig();
    if (serviceWorker === false) return next();
    return res
      .type('js')
      .set('Service-Worker-Allowed', serviceWorkerScope)
      .set('Cache-Control', 'no-store, no-cache')
      .send(serviceWorkerScript);
  };
}
