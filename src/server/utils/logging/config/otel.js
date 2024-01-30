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

import pino from 'pino';
import flatten from 'flat';
import {
  serializeError,
  formatLogEntry,
} from '../utils';
import getOtelResourceAttributes from '../../getOtelResourceAttributes';
import readJsonFile from '../../readJsonFile';

const { buildVersion: version } = readJsonFile('../../../.build-meta.json');

export function createOtelTransport() {
  let logRecordProcessorOptions = {
    recordProcessorType: process.env.INTEGRATION_TEST === 'true' ? 'simple' : 'batch',
    exporterOptions: { protocol: 'grpc' },
  };

  if (process.env.NODE_ENV === 'development') {
    logRecordProcessorOptions = [logRecordProcessorOptions, {
      recordProcessorType: 'simple',
      exporterOptions: { protocol: 'console' },
    }];
  }

  return pino.transport({
    target: 'pino-opentelemetry-transport',
    options: {
      messageKey: 'message',
      loggerName: process.env.OTEL_SERVICE_NAME,
      serviceVersion: version,
      logRecordProcessorOptions,
      resourceAttributes: getOtelResourceAttributes(),
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
