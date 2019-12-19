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

import dropEntryBasedOnLevel from '../level-dropper';
import {
  coloredLevels,
  printStatusCode,
  printStatusMessage,
  printDurationTime,
} from './utils';

const formatter = (levelName, ...args) => {
  if (dropEntryBasedOnLevel(levelName)) {
    return null;
  }

  const level = coloredLevels[levelName];
  const obj = args[0];

  switch (obj && obj.type) {
    case 'request':
      if (obj.request.direction === 'out') {
        return `${level}: 💻 ➡ 🗄️ ${printStatusCode(obj)} ${printStatusMessage(obj)} ${obj.request.metaData.method} ${obj.request.address.uri} ${printDurationTime(obj)}ms`;
      }
      return `${level}: 🌍 ➡ 💻 ${printStatusCode(obj)} ${printStatusMessage(obj)} ${obj.request.metaData.method} ${obj.request.address.uri} ${obj.request.timings.ttfb}/${obj.request.timings.duration}ms`;
    default:
      return `${level}: ${util.format.apply(null, args)}`;
  }
};

const beforeWrite = undefined;
const afterWrite = undefined;

export {
  // eslint rule prefer-default doesn't work for this pattern, so we'll be explicit
  beforeWrite,
  afterWrite,
  formatter,
};
