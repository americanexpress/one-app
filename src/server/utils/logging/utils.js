/*
 * Copyright 2019 American Express Travel Related Services Company, Inc.
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

import { STATUS_CODES } from 'http';

import chalk from 'chalk';

const coloredLevels = {
  error: chalk.red('error'),
  warn: chalk.yellow('warn'),
  log: chalk.blue('log'),
  info: chalk.gray('info'),
};

function printStatusCode(obj) {
  const { request: { statusCode } } = obj;

  if (statusCode === null) {
    return chalk.black.bgRed(statusCode);
  }

  if (statusCode < 300) {
    // 100s, 200s
    return chalk.green(statusCode);
  }
  if (statusCode < 400) {
    // 300s
    return chalk.blue(statusCode);
  }
  if (statusCode < 500) {
    // 400s
    return chalk.yellow(statusCode);
  }
  // 500s
  return chalk.red(statusCode);
}

function printStatusMessage(obj) {
  const { request: { statusText, statusCode } } = obj;

  return statusText || STATUS_CODES[statusCode] || chalk.black.bgRed('Timed Out?');
}

function printDurationTime(obj) {
  const { request: { timings: { duration } } } = obj;
  if (duration < 100) {
    return chalk.green(duration);
  }
  if (duration < 1e3) {
    return chalk.yellow(duration);
  }
  if (duration < 6e3) {
    return chalk.red(duration);
  }
  return chalk.black.bgRed(duration);
}

const serializeError = (err) => ({
  name: err.name,
  message: err.message || '<none>',
  stacktrace: err.stack || '<none>',
});

function formatLogEntry(entry) {
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
}

export {
  coloredLevels,
  printStatusCode,
  printStatusMessage,
  printDurationTime,
  serializeError,
  formatLogEntry,
};
