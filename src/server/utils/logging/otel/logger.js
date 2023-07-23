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

import os from 'os';
import {
  LoggerProvider,
  ConsoleLogRecordExporter,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { logs } from '@opentelemetry/api-logs';
import formatter from './formatter';
import readJsonFile from '../../readJsonFile';

const { buildVersion: version } = readJsonFile('../../../.build-meta.json');

let logger;

export const createOtelLogger = () => {
  const customResourceAttributes = process.env.OTEL_RESOURCE_ATTRIBUTES.split(';').reduce((acc, curr) => {
    const [key, value] = curr.split('=');
    return {
      ...acc,
      [key]: value,
    };
  }, {});

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME,
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: process.env.OTEL_SERVICE_NAMESPACE,
    [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: `${os.hostname()}:${process.pid}`,
    [SemanticResourceAttributes.SERVICE_VERSION]: version,
    ...customResourceAttributes,
  });

  const collectorOptions = {
    url: process.env.OTEL_LOG_COLLECTOR_URL,
    headers: {},
    concurrencyLimit: 10,
    resource,
  };

  const loggerProvider = new LoggerProvider({ resource });
  const logExporter = new OTLPLogExporter(collectorOptions);

  if (process.env.NODE_ENV === 'development') {
    loggerProvider.addLogRecordProcessor(
      new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())
    );
  }
  loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(logExporter));
  logs.setGlobalLoggerProvider(loggerProvider);

  logger = logs.getLogger(process.env.OTEL_SERVICE_NAME);

  return logger;
};

function replaceConsoleMethod(methodName) {
  console[methodName] = function monkeypatchedMethod(...args) {
    const logRecord = formatter(methodName, ...args);
    logger.emit(logRecord);
  };
}

export function replaceGlobalConsoleWithOtelLogger() {
  createOtelLogger();
  const methods = ['error', 'warn', 'log', 'info', 'debug'];
  methods.forEach(replaceConsoleMethod);
}
