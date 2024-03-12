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
import { envDetectorSync } from '@opentelemetry/resources';
import readJsonFile from './readJsonFile';

const { buildVersion: version } = readJsonFile('../../../.build-meta.json');

export default function getOtelResourceAttributes() {
  return {
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: process.env.OTEL_SERVICE_NAMESPACE,
    [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: os.hostname(),
    [SemanticResourceAttributes.SERVICE_VERSION]: version,
    ...envDetectorSync.detect().attributes,
  };
}
