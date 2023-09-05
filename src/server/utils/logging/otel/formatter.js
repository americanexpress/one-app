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
import util from 'util';
import { SeverityNumber } from '@opentelemetry/api-logs';
import flatten from 'flat';

function getBaseRecord(level) {
  let severityText = level.toUpperCase();
  if (typeof SeverityNumber[severityText] === 'undefined') {
    severityText = 'INFO';
  }
  return {
    attributes: {
      agent: `${os.type()} ${os.arch()}`,
    },
    severityText,
    severityNumber: SeverityNumber[severityText],
  };
}

function generateErrorField(err) {
  return {
    name: err.name,
    // doesn't accept `null`
    message: err.message || '<none>',
    stacktrace: err.stack || '<none>',
    // TODO: parse the stacktrace for the file, line, and column?
    // throwLocation: {
    //   file: 'browser.js',
    //   lineNumber: 1234,
    //   columnNumber: 123,
    //   method: 'functionName',
    // },
  };
}

function leadingErrorWithOtherArgs(level, ...args) {
  const [err] = args;
  const record = getBaseRecord(level);
  record.body = err.message;
  record.attributes.error = generateErrorField(err);

  if (err.name === 'ClientReportedError') {
    record.attributes.device = {
      agent: err.userAgent,
    };
    record.attributes.request = {
      address: {
        uri: err.uri,
      },
      metaData: err.metaData,
    };
  } else if (err.metaData) {
    record.attributes.metaData = err.metaData;
  }

  if (args.length > 1) {
    const allButFirst = [...args];
    allButFirst.shift();
    record.body = util.format(...allButFirst);
  }
  return record;
}

function leadingStringWithError(level, ...args) {
  const record = getBaseRecord(level);
  record.attributes.error = generateErrorField(args[1]);
  if (args.length === 2) {
    [record.body] = args;
  } else {
    record.body = util.format(...args);
  }
  return record;
}

function recordFromLogType(level, logType) {
  const record = getBaseRecord(level);
  switch (logType.type) {
    case 'request':
      record.attributes.request = logType.request;
      break;
    default:
      return false;
  }
  return record;
}

const formatter = (level, ...args) => {
  const [arg0, arg1] = args;
  let record;

  if (arg0 instanceof Error) {
    record = leadingErrorWithOtherArgs(level, ...args);
  }
  if (typeof arg0 === 'string' && arg1 instanceof Error) {
    record = leadingStringWithError(level, ...args);
  }
  if (typeof arg0 === 'object' && arg0 && arg0.type) {
    record = recordFromLogType(level, arg0);
  }

  if (!record) {
    record = getBaseRecord(level);
    record.body = util.format(...args);
  }

  // flatten takes a deeply-nested object and returns an object of values one
  // level deep with period-delimited keys
  record.attributes = flatten(record.attributes);

  return record;
};

export default formatter;
