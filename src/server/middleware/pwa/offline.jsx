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

import React from 'react';
import { composeModules, RenderModule } from 'holocron';
import { Provider } from 'react-redux';

import { renderForStaticMarkup } from '../../utils/reactRendering';

import { getServerPWAConfig } from './config';

async function appShellMiddleware(req, res, next) {
  const { store: { getState, dispatch } } = req;
  const initialState = getState();
  const rootModuleName = initialState.getIn(['config', 'rootModuleName']);

  await dispatch(composeModules([{ name: rootModuleName }]));

  const { renderedString, helmetInfo } = renderForStaticMarkup(
    <Provider store={req.store}>
      <RenderModule moduleName={rootModuleName} />
    </Provider>
  );

  req.appHtml = renderedString;
  req.helmetInfo = helmetInfo;
  req.renderMode = 'render';

  next();
}

export function createOfflineMiddleware(oneApp) {
  const middlewareStack = [
    // addFrameOptionsHeader,
    // createRequestStore({
    //   decorateRequest: () => {},
    //   addHook: () => {},
    // }, oneApp),
    appShellMiddleware,
    // sendHtml,
  ];

  return async function offlineMiddleware(req, res, next) {
    const { serviceWorker } = getServerPWAConfig();
    if (serviceWorker === false) next();
    else {
      console.log('--middlewareStack', middlewareStack)
      await (async function stackIterator(stack) {
        const middleware = stack.shift();
        console.log(middleware);
        await middleware(req, res, stack.length === 0 ? next : stackIterator.bind(null, stack));
      }([...middlewareStack]));
    }
  };
}

export default function offlineHandler() {
}
