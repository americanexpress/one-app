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
import { getLocalePack, addErrorToReport } from '@americanexpress/one-app-ducks';
import { compose } from 'redux';

import createEnhancer from '../universal/enhancers';
import reducer from '../universal/reducers';
import transit from '../universal/utils/transit';
import createTimeoutFetch from '../universal/utils/createTimeoutFetch';
import { initializeServiceWorker } from './service-worker';

export function initializeClientStore() {
  // Six second timeout on client
  const enhancedFetch = compose(createTimeoutFetch(6e3))(fetch);

  const enhancer = createEnhancer();
  /* eslint-disable no-underscore-dangle */
  const initialState = global.__INITIAL_STATE__ !== undefined
    ? transit.fromJSON(global.__INITIAL_STATE__) : undefined;
  const store = createHolocronStore({
    reducer, initialState, enhancer, extraThunkArguments: { fetchClient: enhancedFetch },
  });

  return store;
}

export function loadPrerenderScripts(initialState) {
  const locale = initialState && initialState.getIn(['intl', 'activeLocale']);
  return locale ? getLocalePack(locale) : Promise.resolve();
}

export function moveHelmetScripts() {
  document.addEventListener('DOMContentLoaded', () => {
    const helmetScripts = [...document.querySelectorAll('script[data-react-helmet]')];
    helmetScripts.forEach((script) => document.body.removeChild(script));
    helmetScripts.forEach((script) => document.head.appendChild(script));
  });
}

export function loadServiceWorker({ dispatch, config }) {
  // To handle any errors that occur during installation, we set this handler
  // for dispatching the error back to the server and tie it to the 'message' event.
  const onError = (error) => dispatch(addErrorToReport(error));
  return initializeServiceWorker({
    onError,
    serviceWorker: config.serviceWorker,
    recoveryMode: config.serviceWorkerRecoveryMode,
    scriptUrl: config.serviceWorkerScriptUrl,
    scope: config.serviceWorkerScope,
    // in the event of any failure, the app should not crash for non-critical
    // progressive enhancement and report the error back to the server
  }).catch(onError);
}
