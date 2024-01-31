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

import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { browserHistory, Router, matchPromise } from '@americanexpress/one-app-router';
import { setModuleMap, setRequiredExternalsRegistry } from 'holocron';

import {
  initializeClientStore, loadPrerenderScripts, moveHelmetScripts, loadServiceWorker,
} from './prerender';
import createRoutes from '../universal/routes';

export default async function initClient() {
  try {
    /* eslint-disable no-underscore-dangle -- private API */
    setModuleMap(global.__CLIENT_HOLOCRON_MODULE_MAP__);
    setRequiredExternalsRegistry(global.__HOLOCRON_EXTERNALS__);
    /* eslint-enable no-underscore-dangle */
    moveHelmetScripts();

    const store = initializeClientStore();
    const history = browserHistory;
    const routes = createRoutes(store);

    await loadPrerenderScripts(store.getState());

    const { redirectLocation, renderProps } = await matchPromise({ history, routes });

    if (redirectLocation) {
      // FIXME: redirectLocation has pathname, query object, etc; need to format the URL better
      // TODO: would `browserHistory.push(redirectLocation);` and render below, but app stalls
      window.location.replace(redirectLocation.pathname);
      return;
    }

    const {
      __pwa_metadata__: pwaConfig,
      __render_mode__: renderMode = 'hydrate',
    } = global;

    // we want to kick off service worker installation and store sync
    // as early as possible, while not blocking the app from rendering
    // so we let this async function run at its own pace and call it synchronously
    loadServiceWorker({
      config: pwaConfig,
      dispatch: store.dispatch,
    });

    /* eslint-disable react/jsx-props-no-spreading -- props are unpredictable */
    /* istanbul ignore next */
    const App = () => (
      <Provider store={store}>
        <Router {...renderProps} />
      </Provider>
    );
    /* eslint-enable react/jsx-props-no-spreading */

    const container = document.querySelector('#root');
    if (renderMode === 'render') {
      const root = createRoot(container);
      root.render(<App />);
    } else {
      hydrateRoot(container, <App />);
    }

    [...document.querySelectorAll('.ssr-css')]
      .forEach((style) => style.remove());

    // eslint-disable-next-line no-underscore-dangle -- private API
    delete global.__INITIAL_STATE__;
    document.querySelector('#initial-state').remove();
  } catch (error) {
    console.error(error);
    // TODO add renderError
  }
}
