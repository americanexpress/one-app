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

import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
  BatchSpanProcessor,
  SimpleSpanProcessor,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  ConsoleSpanExporter,
  NoopSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { trace } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { argv } from 'yargs';
import getOtelResourceAttributes from './getOtelResourceAttributes';

const tracerProvider = new NodeTracerProvider({
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(1),
  }),
  resource: { attributes: getOtelResourceAttributes() },
});

const devCdnPort = process.env.HTTP_ONE_APP_DEV_CDN_PORT || '3001';
const traceAllRequests = process.env.ONE_TRACE_ALL_REQUESTS === 'true';

registerInstrumentations({
  tracerProvider,
  instrumentations: [
    new HttpInstrumentation({
      ignoreIncomingRequestHook: !traceAllRequests
        ? (request) => request.url.startsWith('/_/') || request.headers.host.endsWith(`:${devCdnPort}`)
        : undefined,
      requireParentforOutgoingSpans: !traceAllRequests,
      requestHook(span) {
        if (span?.attributes?.direction === 'in') {
          span.updateName(`${span.attributes['http.method']} ${span.attributes['http.target']}`);
        }
        if (span?.attributes?.direction === 'out') {
          span.updateName(`${span.attributes['http.method']} ${span.attributes['http.url']}`);
        }
      },
      startIncomingSpanHook: () => ({ direction: 'in' }),
      startOutgoingSpanHook: () => ({ direction: 'out' }),
    }),
    new PinoInstrumentation(),
  ],
});

class PropagateAttributesProcessor extends NoopSpanProcessor {
  // This is better covered by integration tests
  /* istanbul ignore next */
  // eslint-disable-next-line class-methods-use-this -- required when creating a span processor
  onStart(span, parentContext) {
    if (span.instrumentationLibrary.name === '@autotelic/fastify-opentelemetry') {
      const parentSpan = trace.getSpan(parentContext);
      if (parentSpan.instrumentationLibrary.name === '@autotelic/fastify-opentelemetry' && parentSpan?.attributes) {
        span.setAttributes(parentSpan.attributes);
      }
    }
  }
}

tracerProvider.addSpanProcessor(new PropagateAttributesProcessor());

const batchProcessor = new BatchSpanProcessor(new OTLPTraceExporter());

if (process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
  tracerProvider.addSpanProcessor(batchProcessor);
}

if (process.env.NODE_ENV === 'development' && argv.logLevel === 'trace') {
  tracerProvider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
}

tracerProvider.register();

['SIGINT', 'SIGTERM'].forEach((signalName) => process.on(signalName, () => batchProcessor.shutdown()));

/* eslint-disable no-underscore-dangle -- exports are for testing only */
// This file should not be imported during runtime, but rather loaded using --require
export const _tracerProvider = tracerProvider;
export const _batchProcessor = batchProcessor;
/* eslint-enable no-underscore-dangle */
