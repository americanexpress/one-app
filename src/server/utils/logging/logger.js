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

  const getPinoConfig = () => {
    if (process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT) return deepmerge(baseConfig, otelConfig);
    if (useProductionConfig) return deepmerge(baseConfig, productionConfig);
    return baseConfig;
  };

  const getTransport = () => {
    const transportStreams = [];
    if (process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT) {
      transportStreams.push(createOtelTransport({
        grpc: true,
        console: process.env.NODE_ENV === 'development' && argv.logFormat === 'machine',
      }));
    }
    if (!useProductionConfig) {
      // eslint-disable-next-line global-require -- do not load development logger in production
      transportStreams.push(require('./config/development').default);
    }

    if (transportStreams.length === 1) return transportStreams[0];
    if (transportStreams.length > 1) return multistream(transportStreams);
    return undefined;
  };

  return pino(getPinoConfig(), getTransport());
}

export default createLogger();
