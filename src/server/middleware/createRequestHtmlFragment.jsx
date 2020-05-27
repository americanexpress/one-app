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
import { Provider } from 'react-redux';
import url, { Url } from 'url';
import { RouterContext, matchPromise } from '@americanexpress/one-app-router';
import { composeModules } from 'holocron';
import createCircuitBreaker from '../utils/createCircuitBreaker';

import { renderForString, renderForStaticMarkup } from '../utils/reactRendering';

const getModuleData = async ({ dispatch, modules }) => {
  await dispatch(composeModules(modules));
  return false;
};

const getModuleDataBreaker = createCircuitBreaker(getModuleData);

export default function createRequestHtmlFragment({ createRoutes }) {
  return async (req, res, next) => {
    try {
      const { store } = req;
      const { dispatch } = store;
      const routes = createRoutes(store);

      const { redirectLocation, renderProps } = await matchPromise({ routes, location: req.url });
      if (redirectLocation) {
        // support redirecting outside our app (i.e. domain/origin)
        // store more than pathname and search as a Url object as redirectLocation.state
        if (redirectLocation.state instanceof Url) {
          res.redirect(302, url.format(redirectLocation.state));
        } else {
          res.redirect(302, redirectLocation.pathname + redirectLocation.search);
        }
        return null;
      }

      if (!renderProps) {
        res.sendStatus(404);
        throw new Error('unable to match routes');
      }

      const { httpStatus } = renderProps.routes.slice(-1)[0];
      if (httpStatus) {
        res.status(httpStatus);
      }

      const props = {
        location: renderProps.location,
        params: renderProps.params,
        router: renderProps.router,
        routes: renderProps.routes,
      };

      const routeModules = renderProps.routes
        .filter((route) => !!route.moduleName)
        .map((route) => ({
          name: route.moduleName,
          props: {
            ...props,
            route,
          },
        }));

      const state = store.getState();
      const disableScripts = state.getIn(['rendering', 'disableScripts']);
      const renderPartialOnly = state.getIn(['rendering', 'renderPartialOnly']);

      if (disableScripts || renderPartialOnly) {
        await dispatch(composeModules(routeModules));
      } else {
        const fallback = await getModuleDataBreaker.fire({ dispatch, modules: routeModules });

        if (fallback) {
          req.appHtml = '';
          req.helmetInfo = {};
          return next();
        }
      }

      const renderMethod = disableScripts || renderPartialOnly
        ? renderForStaticMarkup : renderForString;

      /* eslint-disable react/jsx-props-no-spreading */
      const { renderedString, helmetInfo } = renderMethod(
        <Provider store={store}>
          <RouterContext {...renderProps} />
        </Provider>
      );
      /* eslint-ensable react/jsx-props-no-spreading */
      req.appHtml = renderedString;
      req.helmetInfo = helmetInfo;
    } catch (err) {
      console.error(`error creating request HTML fragment for ${req.url}`, err);
    }

    return next();
  };
}
