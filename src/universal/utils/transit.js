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

// This file needs conditional requires depending on whether it is executed in
// the browser or on the server
/* eslint-disable global-require */

import instance, { handlers } from 'transit-immutable-js';
import transit from 'transit-js';
import { serializeError } from 'serialize-error';

const concealOrigin = (href) => href && href.replace(/\/\/[^/]+/g, '//***');

export function writeError(value) {
  const error = serializeError(value);
  delete error.stack;
  error.message = concealOrigin(error.message);
  if (error.response) {
    error.response.url = concealOrigin(error.response.url);
  }

  return error;
}

const extraHandlers = [
  {
    tag: 'error',
    class: Error,
    write: writeError,
    read: (value) => Object.assign(new Error(), { stack: undefined }, value),
  },
  {
    tag: 'promise',
    class: Promise,
    write: () => null,
    read: () => null,
  },
  {
    tag: 'url',
    class: global.BROWSER ? URL : require('url').Url,
    write: (value) => value.href,
    read: (value) => (global.BROWSER
      ? new URL(value, global.location.href)
      : require('url').parse(value)
    ),
  },
];

const modifiedHandlers = handlers.withExtraHandlers(extraHandlers);

const reader = transit.reader('json', {
  handlers: modifiedHandlers.read,
  cache: false,
  // Copied from transit-immutable-js. Without this, Error fails to read.
  mapBuilder: {
    init() {
      return {};
    },
    add(m, k, v) {
      // eslint-disable-next-line no-param-reassign
      m[k] = v;
      return m;
    },
    finalize(m) {
      return m;
    },
  },
});
const writer = transit.writer('json', { handlers: modifiedHandlers.write, cache: false });

export default {
  ...instance.withExtraHandlers(extraHandlers), // added for test cases
  toJSON: (data) => writer.write(data),
  fromJSON: (json) => reader.read(json),
};
