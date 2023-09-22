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

import deepmerge from 'deepmerge';
import { argv } from 'yargs';
import { pino, multistream } from 'pino';
import productionConfig from './config/production';
import otelConfig, {
  createOtelTransport,
} from './config/otel';
import baseConfig from './config/base';

export function createLogger() {
  const useProductionConfig = !!(argv.logFormat === 'machine' || process.env.NODE_ENV !== 'development');

  let transport;

  if (process.env.NODE_ENV === 'development' && process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT) {
    // Temporary solution until https://github.com/Vunovati/pino-opentelemetry-transport/issues/20 is resolved
    // eslint-disable-next-line global-require -- do not load development logger in production
    transport = multistream([{ stream: require('./config/development').default }, createOtelTransport()]);
  } else if (!useProductionConfig && !process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT) {
    // eslint-disable-next-line global-require -- do not load development logger in production
    transport = require('./config/development').default;
  } else if (process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT) {
    transport = createOtelTransport();
  }

  return pino(
    deepmerge(
      baseConfig,
      process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
        ? otelConfig
        : useProductionConfig && productionConfig
    ),
    transport
  );
}

export default createLogger();
