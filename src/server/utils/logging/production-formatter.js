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

import util from 'util';
import os from 'os';
import dropEntryBasedOnLevel from './level-dropper';
import readJsonFile from '../readJsonFile';

const { buildVersion: version } = readJsonFile('../../../.build-meta.json');
const schemaVersion = '0.3.0';

const application = {
  name: 'One App',
  version,
};

const device = {
  id: `${os.hostname()}:${process.pid}`,
  agent: `${os.type()} ${os.arch()}`,
};

const nodeLevelToSchemaLevel = {
  // 'emergency',
  // 'alert',
  // 'critical',
  error: 'error',
  warn: 'warning',
  log: 'notice',
  info: 'info',
  // 'debug',
};

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

function getBaseEntry(level) {
  return {
    schemaVersion,
    application,
    device,
    level: nodeLevelToSchemaLevel[level],
    timestamp: new Date().toISOString(),
  };
}

function leadingErrorWithOtherArgs(level, ...args) {
  const [err] = args;
  const entry = getBaseEntry(level);
  entry.error = generateErrorField(err);

  if (err.name === 'ClientReportedError') {
    entry.device = {
      agent: err.userAgent,
    };
    entry.request = {
      address: {
        uri: err.uri,
      },
      metaData: err.metaData,
    };
  }

  if (args.length > 1) {
    const allButFirst = [...args];
    allButFirst.shift();
    entry.message = util.format(...allButFirst);
  }
  return entry;
}

function leadingStringWithError(level, ...args) {
  const entry = getBaseEntry(level);
  entry.error = generateErrorField(args[1]);
  if (args.length === 2) {
    [entry.message] = args;
  } else {
    entry.message = util.format(...args);
  }
  return entry;
}

function entryFromLogType(level, logType) {
  const entry = getBaseEntry(level);
  switch (logType.type) {
    case 'request':
      entry.request = logType.request;
      break;
    default:
      return false;
  }
  return entry;
}

const formatter = (level, ...args) => {
  if (dropEntryBasedOnLevel(level)) {
    return null;
  }

  const [arg0, arg1] = args;

  if (arg0 instanceof Error) {
    return JSON.stringify(leadingErrorWithOtherArgs(level, ...args));
  }
  if (typeof arg0 === 'string' && arg1 instanceof Error) {
    return JSON.stringify(leadingStringWithError(level, ...args));
  }
  if (typeof arg0 === 'object' && arg0 && arg0.type) {
    const entry = entryFromLogType(level, arg0);
    if (entry) {
      return JSON.stringify(entry);
    }
  }

  const entry = getBaseEntry(level);
  entry.message = util.format(...args);
  return JSON.stringify(entry);
};

export default formatter;
