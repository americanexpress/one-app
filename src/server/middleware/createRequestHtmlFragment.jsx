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

import url, { Url } from 'url';
import util from 'util';

import React from 'react';
import { Provider } from 'react-redux';
import { RouterContext, matchPromise } from '@americanexpress/one-app-router';
import { composeModules } from 'holocron';

import createCircuitBreaker from '../utils/createCircuitBreaker';
import {
  startSummaryTimer,

  ssr as ssrMetrics,
} from '../metrics';

import {
  getRenderMethodName,
  renderForStaticMarkup,
  renderForString,
} from '../utils/reactRendering';
import { renderStaticErrorPage } from './sendHtml';

import { isRedirectUrlAllowed } from '../utils/redirectAllowList';

const getModuleData = async ({ dispatch, modules }) => {
  try {
    await dispatch(composeModules(modules));
  } catch (err) {
    if (err.abortComposeModules && err.redirect) return { redirect: err.redirect, fallback: false };
    throw err;
  }
  return { fallback: false };
};

const getModuleDataBreaker = createCircuitBreaker(getModuleData);

export default function createRequestHtmlFragment({ createRoutes }) {
  // eslint-disable-next-line complexity
  return async (req, res, next) => {
    try {
      req.tracer.startServerPhaseTimer('3');

      const { store } = req;
      const { dispatch } = store;
      const routes = createRoutes(store);

      req.tracer.endServerPhaseTimer('3');

      req.tracer.startServerPhaseTimer('4');
      const { redirectLocation, renderProps } = await matchPromise({
        routes,
        location: req.url,
      });
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

      req.tracer.endServerPhaseTimer('4');

      req.tracer.startServerPhaseTimer('5');
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
      req.tracer.endServerPhaseTimer('5');

      req.tracer.startServerPhaseTimer('6');
      if (getRenderMethodName(state) === 'renderForStaticMarkup') {
        await dispatch(composeModules(routeModules));
      } else {
        const { fallback, redirect } = await getModuleDataBreaker.fire({
          dispatch,
          modules: routeModules,
        });

        if (redirect) {
          if (!isRedirectUrlAllowed(redirect.url)) {
            renderStaticErrorPage(res);
            console.error(`'${redirect.url}' is not an allowed redirect URL`);
            return next();
          }
          res.redirect(redirect.status || 302, redirect.url);
          return null;
        }

        if (fallback) {
          req.appHtml = '';
          req.helmetInfo = {};
          return next();
        }
      }
      req.tracer.endServerPhaseTimer('6');
      req.tracer.startServerPhaseTimer('7');
      const renderMethodName = getRenderMethodName(state);
      const renderMethod = renderMethodName === 'renderForStaticMarkup'
        ? renderForStaticMarkup
        : renderForString;

      const finishRenderTimer = startSummaryTimer(ssrMetrics.reactRendering, { renderMethodName });
      /* eslint-disable react/jsx-props-no-spreading */
      const { renderedString, helmetInfo } = renderMethod(
        <Provider store={store}>
          <RouterContext {...renderProps} />
        </Provider>
      );
      /* eslint-ensable react/jsx-props-no-spreading */
      finishRenderTimer();

      req.appHtml = renderedString;
      req.helmetInfo = helmetInfo;
      req.tracer.endServerPhaseTimer('7');
    } catch (err) {
      console.error(util.format('error creating request HTML fragment for %s', req.url), err);
      req.tracer.endServerPhaseTimer('7');
    }

    return next();
  };
}
