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

import { getClientModuleMapCache } from '../utils/clientModuleMapCache';
import { getServerPWAConfig } from './config';

function processServiceWorkerScript(script) {
  const holocronModuleMap = `'${JSON.stringify(getClientModuleMapCache().browser)}'`;
  return Buffer.from(script.toString().replace('process.env.HOLOCRON_MODULE_MAP', holocronModuleMap));
}

/**
 * Route Service Worker handler to be used in a custom route
 * @param {import("fastify").FastifyReply} request Fastify Request object
 * @param {import("fastify").FastifyReply} reply Fastify Reply object
 */
const serviceWorkerHandler = (_request, reply) => {
  const { serviceWorker, serviceWorkerScope, serviceWorkerScript } = getServerPWAConfig();

  if (serviceWorker) {
    reply
      .type('application/javascript')
      .header('Service-Worker-Allowed', serviceWorkerScope)
      .header('Cache-Control', 'no-store, no-cache')
      .send(processServiceWorkerScript(serviceWorkerScript));
  } else {
    reply.status(404).send('Not found');
  }
};

export default serviceWorkerHandler;
