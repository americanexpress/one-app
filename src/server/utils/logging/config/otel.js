/*
 * Copyright 2023 American Express Travel Related Services Company, Inc.
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

import os from 'node:os';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
// import { registerInstrumentations } from '@opentelemetry/instrumentation';
// import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
// import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
// import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import pino from 'pino';
import flatten from 'flat';
import {
  serializeError,
  formatLogEntry,
} from '../utils';
import readJsonFile from '../../readJsonFile';

const { buildVersion: version } = readJsonFile('../../../.build-meta.json');

// TODO: enable Fastify instrumentation once https://github.com/open-telemetry/opentelemetry-js-contrib/issues/1275
// is resolved. Depends on https://github.com/fastify/fastify/pull/4470

// if (process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT) {
//   const provider = new NodeTracerProvider();
//   provider.register();
//   registerInstrumentations({
//     instrumentations: [
//       new HttpInstrumentation(),
//       new FastifyInstrumentation(),
//     ],
//   });
// }

export function createOtelTransport() {
  const customResourceAttributes = process.env.OTEL_RESOURCE_ATTRIBUTES ? process.env.OTEL_RESOURCE_ATTRIBUTES.split(';').reduce((acc, curr) => {
    const [key, value] = curr.split('=');
    return {
      ...acc,
      [key]: value,
    };
  }, {}) : {};

  const logRecordProcessorOptions = [{
    recordProcessorType: 'batch',
    exporterOptions: { protocol: 'grpc' },
  }];

  if (process.env.NODE_ENV === 'development') {
    logRecordProcessorOptions.push({
      recordProcessorType: 'simple',
      exporterOptions: { protocol: 'console' },
    });
  }

  return pino.transport({
    target: 'pino-opentelemetry-transport',
    options: {
      messageKey: 'message',
      loggerName: process.env.OTEL_SERVICE_NAME,
      serviceVersion: version,
      logRecordProcessorOptions,
      resourceAttributes: {
        [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME,
        [SemanticResourceAttributes.SERVICE_NAMESPACE]: process.env.OTEL_SERVICE_NAMESPACE,
        [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: os.hostname(),
        [SemanticResourceAttributes.SERVICE_VERSION]: version,
        ...customResourceAttributes,
      },
    },
  });
}

export default {
  base: {
    schemaVersion: '1.0.0',
  },
  serializers: {
    err: serializeError,
  },
  formatters: {
    level(label, number) {
      return { level: number === 35 ? 30 : number };
    },
    log(entry) {
      const formattedEntry = formatLogEntry(entry);
      return flatten(formattedEntry);
    },
  },
};
