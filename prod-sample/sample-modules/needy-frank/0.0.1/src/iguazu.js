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

import { configureIguazuRPC, setProcedures } from 'iguazu-rpc';
import { configureIguazuREST } from 'iguazu-rest';
import hash from 'object-hash';

export const configureIguazu = () => {
  configureIguazuRPC({
    getToState: (state) => state.getIn(['modules', 'needy-frank', 'procedures']),
  });

  configureIguazuREST({
    getToState: (state) => state.getIn(['modules', 'needy-frank', 'resources']),
    defaultOpts: {
      credentials: 'include',
    },
  });
  setProcedures({
    readPosts: {
      call: ({
        fetchClient = fetch,
        args: { api, ...restArgs } = { api: '', restArgs: {} },
      }) => fetchClient(api, restArgs)
        .then((response) => {
          if (response.ok) {
            return response;
          }
          return response.text().then((text) => { throw new Error(text); });
        })
        .then((res) => res.json()),
      getResultFromCache: ({ args, cache }) => {
        const hashedArgs = hash(args);
        if (!cache.has(hashedArgs)) {
          throw new Error('make the call');
        }
        return cache.get(hashedArgs);
      },
      buildUpdatedCache: ({
        cache, args, result, error,
      }) => (
        typeof result === 'undefined' && typeof error === 'undefined'
          ? cache.remove(hash(args))
          : cache.set(hash(args), error || result)
      ),
    },
  });
};

export default configureIguazu;
