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

// eslint-disable-next-line import/no-extraneous-dependencies -- this is only loaded in development
import pinoPretty from 'pino-pretty';
import {
  printStatusCode,
  printStatusMessage,
  printDurationTime,
} from '../utils';

export default pinoPretty({
  ignore: 'pid,hostname,time',
  customLevels: {
    trace: 10,
    debug: 20,
    info: 30,
    log: 35,
    warn: 40,
    error: 50,
    fatal: 60,
  },
  customColors: 'trace:white,debug:green,info:gray,log:blue,warn:yellow,error:red,fatal:bgRed',
  messageFormat(log, messageKey) {
    if (log.request) {
      if (log.request.direction === 'out') {
        return `💻 ➡ 🗄️ ${printStatusCode(log)} ${printStatusMessage(log)} ${log.request.metaData.method} ${log.request.address.uri} ${printDurationTime(log)}ms`;
      }
      return `🌍 ➡ 💻 ${printStatusCode(log)} ${printStatusMessage(log)} ${log.request.metaData.method} ${log.request.address.uri} ${log.request.timings.ttfb}/${log.request.timings.duration}ms`;
    }
    return log[messageKey];
  },
});
