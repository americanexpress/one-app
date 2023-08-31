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
import {
  LoggerProvider,
  ConsoleLogRecordExporter,
  SimpleLogRecordProcessor,
  BatchLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { logs } from '@opentelemetry/api-logs';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import formatter from './formatter';
import readJsonFile from '../../readJsonFile';

const { buildVersion: version } = readJsonFile('../../../.build-meta.json');

const logMethods = ['error', 'warn', 'log', 'info', 'debug'];

let batchLogProcessor;

export function shutdownOtelLogger() {
  if (batchLogProcessor) return batchLogProcessor.shutdown();
  return undefined;
}

function setupTracer() {
  const provider = new NodeTracerProvider();
  provider.register();
  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
    ],
  });
}

export function createOtelLogger() {
  const customResourceAttributes = process.env.OTEL_RESOURCE_ATTRIBUTES ? process.env.OTEL_RESOURCE_ATTRIBUTES.split(';').reduce((acc, curr) => {
    const [key, value] = curr.split('=');
    return {
      ...acc,
      [key]: value,
    };
  }, {}) : {};

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME,
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: process.env.OTEL_SERVICE_NAMESPACE,
    [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: os.hostname(),
    [SemanticResourceAttributes.SERVICE_VERSION]: version,
    ...customResourceAttributes,
  });

  const collectorOptions = {
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

  batchLogProcessor = new BatchLogRecordProcessor(logExporter);

  loggerProvider.addLogRecordProcessor(batchLogProcessor);
  logs.setGlobalLoggerProvider(loggerProvider);

  const otelLogger = logs.getLogger(process.env.OTEL_SERVICE_NAME);

  // Add trace IDs to logs
  setupTracer();

  const logger = logMethods.reduce((loggerObj, logMethod) => {
    function emitLog(...args) {
      const logRecord = formatter(logMethod, ...args);
      otelLogger.emit(logRecord);
    }
    return { ...loggerObj, [logMethod]: emitLog };
  }, {});

  return logger;
}

export function replaceGlobalConsoleWithOtelLogger(logger) {
  logMethods.forEach((methodName) => { console[methodName] = logger[methodName]; });
  return logger;
}
