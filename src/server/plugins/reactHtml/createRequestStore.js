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

import { createHolocronStore } from 'holocron';
import { fromJS, Set as iSet } from 'immutable';

import renderStaticErrorPage from './staticErrorPage';
import createEnhancer from '../../../universal/enhancers';
import safeRequest from '../../utils/safeRequest';
import { getServerStateConfig, getClientStateConfig } from '../../utils/stateConfig';
import createSsrFetch from '../../utils/createSsrFetch';
import { getClientModuleMapCache } from '../../utils/clientModuleMapCache';

const createRequestStore = (
  request, reply,
  { reducers }
) => {
  // fastify.decorateRequest('store', null);
  // fastify.decorateRequest('clientModuleMapCache', null);

  try {
    const serverConfig = getServerStateConfig();
    const clientConfig = getClientStateConfig();

    const initialServerState = fromJS({
      holocron: { loaded: iSet() },
      config: serverConfig,
    });

    const fetchClient = createSsrFetch({
      req: request.raw,
      res: reply.raw,
    })(fetch);

    console.log('--request.method', request.method);
    console.log('--request.body', request.body);
    console.log('--request.raw.body', request.raw.body);

    const enhancer = createEnhancer();
    const localsForBuildInitialState = {
      req: safeRequest(request, { useBodyForBuildingTheInitialState: request.method.toLowerCase() === 'post' }),
      config: clientConfig,
    };

    const store = createHolocronStore({
      reducer: reducers,
      initialState: initialServerState.merge(
        fromJS(reducers.buildInitialState(localsForBuildInitialState))
      ),
      enhancer,
      localsForBuildInitialState,
      extraThunkArguments: { fetchClient },
    });

    // TODO: namespace?
    // use the store as a global for the request
    request.store = store; // eslint-disable-line no-param-reassign
    request.clientModuleMapCache = getClientModuleMapCache();
  } catch (err) {
    console.error('error creating store for request', err);
    // TODO: migrate `renderStaticErrorPage`
    return renderStaticErrorPage(reply);
  }
};

export default createRequestStore;
