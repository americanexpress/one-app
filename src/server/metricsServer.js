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

import express from 'express';
import helmet from 'helmet';
import { register as metricsRegister, collectDefaultMetrics } from 'prom-client';
import gcStats from 'prometheus-gc-stats';

import logging from './utils/logging/serverMiddleware';
import healthCheck from './middleware/healthCheck';

// Probe every 10th second.
collectDefaultMetrics({ timeout: 10e3 });
gcStats(metricsRegister)();

// prometheus-gc-stats uses gc-stats but swallows the error if not importable
// try importing ourselves so we can log a warning
try {
  /* eslint import/no-extraneous-dependencies: ["error", {"optionalDependencies": true}] */
  // eslint-disable-next-line global-require, import/no-unresolved
  require('gc-stats');
} catch (err) {
  console.warn('Unable to set up garbage collection monitor. This is not an issue for local development.');
}

export function createMetricsServer() {
  const app = express();

  app.disable('x-powered-by');
  app.disable('e-tag');

  app.use(helmet());
  app.use(logging);

  app.get('/im-up', healthCheck);

  app.get('/metrics', (req, res) => {
    res.set('Content-Type', metricsRegister.contentType);
    res.end(metricsRegister.metrics());
  });

  app.use('/', (req, res) => res.status(404).set('Content-Type', 'text/plain').send(''));

  return app;
}

export default createMetricsServer();
