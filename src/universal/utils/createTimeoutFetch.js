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

export function TimeoutError(...args) {
  const native = Error.apply(this, args);
  this.name = 'TimeoutError';
  this.message = native.message;
  this.stack = native.stack;
}

TimeoutError.prototype = Object.create(Error.prototype, {
  constructor: {
    value: TimeoutError,
  },
});

export default function createTimeoutFetch(defaultTimeout) {
  return (next) => (path, opts = {}) => {
    const timeout = opts.timeout || defaultTimeout;
    return Promise.race([
      next(path, opts),
      new Promise((res, rej) => {
        setTimeout(
          // fetch currently doesn't have a way to stop the request
          // https://github.com/whatwg/fetch/issues/27
          // TODO: be sure to add that call here once/if that is added to the API
          () => rej(new TimeoutError(`${path} after ${timeout}ms`)),
          timeout
        );
      }),
    ]);
  };
}
