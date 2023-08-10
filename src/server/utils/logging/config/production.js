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
import readJsonFile from '../../readJsonFile';

const { buildVersion: version } = readJsonFile('../../../.build-meta.json');

export default {
  timestamp: () => `,"timestamp":"${new Date(Date.now()).toISOString()}"`,
  messageKey: 'message',
  errorKey: 'error',
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
    err(err) {
      return {
        name: err.name,
        message: err.message || '<none>',
        stacktrace: err.stack || '<none>',
      };
    },
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
    log(entry) {
      /* eslint-disable no-param-reassign */
      if (entry.error) {
        if (entry.error.name === 'ClientReportedError') {
          entry.device = {
            agent: entry.error.userAgent,
          };
          entry.request = {
            address: {
              uri: entry.error.uri,
            },
            metaData: entry.error.metaData,
          };
        } else if (entry.error.metaData) {
          entry.metaData = entry.error.metaData;
        }
      }
      return entry;
    },
  },
};
