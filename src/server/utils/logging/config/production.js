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
  serializeError,
  formatLogEntry,
} from '../utils';
import readJsonFile from '../../readJsonFile';

const { buildVersion: version } = readJsonFile('../../../.build-meta.json');

export default {
  timestamp: () => `,"timestamp":"${new Date(Date.now()).toISOString()}"`,
  // TODO: move messageKey to base config once pino bug is resolved
  // https://github.com/pinojs/pino/issues/1790
  messageKey: 'message',
  base: {
    schemaVersion: '0.3.0',
    application: {
      name: 'One App',
      version,
    },
    device: {
      id: `${os.hostname()}:${process.pid}`,
      agent: `${os.type()} ${os.arch()}`,
    },
  },
  serializers: {
    err: serializeError,
  },
  formatters: {
    level(label) {
      const nodeLevelToSchemaLevel = {
        error: 'error',
        warn: 'warning',
        log: 'notice',
        info: 'info',
      };
      return { level: nodeLevelToSchemaLevel[label] || label };
    },
    log: formatLogEntry,
  },
};
