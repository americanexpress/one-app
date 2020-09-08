/*
 * Copyright 2020 American Express Travel Related Services Company, Inc.
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

// create fetch with 1second timeout

const createFrankLikeSsrFetch = () => (fetch) => (path, opts = {}) => {
  const fullOpts = { ...opts };
  fullOpts.headers = {
    ...opts.headers,
    'auth-token': 'yoyo',
  };

  const timeout = 1e3;
  return Promise.race([
    fetch(path, fullOpts),
    new Promise((_, rej) => {
      setTimeout(
        () => rej(new Error(`Request to ${path} was too slow`)),
        timeout
      );
    }),
  ]);
};

export default createFrankLikeSsrFetch;
