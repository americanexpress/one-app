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
import { SeverityNumber } from '@opentelemetry/api-logs';
import {
  serializeError,
  formatLogEntry,
} from '../utils';
import getOtelResourceAttributes from '../../getOtelResourceAttributes';
import readJsonFile from '../../readJsonFile';
import pinoBaseConfig from './base';

const { buildVersion: version } = readJsonFile('../../../.build-meta.json');

export function createOtelTransport({
  grpc: grpcExporter = true,
  console: consoleExporter = false,
} = {}) {
  if (!grpcExporter && !consoleExporter) {
    console.error('OTEL DISABLED: attempted to create OpenTelemetry transport without including a processor');
    return undefined;
  }

  let logRecordProcessorOptions = [];

  if (grpcExporter) {
    logRecordProcessorOptions.push({
      recordProcessorType: process.env.INTEGRATION_TEST === 'true' ? 'simple' : 'batch',
      exporterOptions: { protocol: 'grpc' },
    });
  }

  if (consoleExporter) {
    if (process.stdout.isTTY && !process.env.NO_COLOR) process.env.FORCE_COLOR = '1';
    logRecordProcessorOptions.push({
      recordProcessorType: 'simple',
      exporterOptions: { protocol: 'console' },
    });
  }

  if (logRecordProcessorOptions.length === 1) {
    [logRecordProcessorOptions] = logRecordProcessorOptions;
  }

  return pino.transport({
    target: 'pino-opentelemetry-transport',
    options: {
      messageKey: pinoBaseConfig.messageKey,
      loggerName: process.env.OTEL_SERVICE_NAME,
      serviceVersion: version,
      logRecordProcessorOptions,
      resourceAttributes: getOtelResourceAttributes(),
      severityNumberMap: {
        [pinoBaseConfig.customLevels.log]: SeverityNumber.INFO2,
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
    log(entry) {
      const formattedEntry = formatLogEntry(entry);
      return flatten(formattedEntry);
    },
  },
};
