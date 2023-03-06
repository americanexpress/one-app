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
import util from 'util';
import { RouterContext, matchPromise } from '@americanexpress/one-app-router';
import { composeModules } from 'holocron';
import createCircuitBreaker from '../../utils/createCircuitBreaker';

import {
  getRenderMethodName,
  renderForStaticMarkup,
  renderForString,
} from '../../utils/reactRendering';

const getModuleData = async ({ dispatch, modules }) => {
  await dispatch(composeModules(modules));
  return false;
};

const getModuleDataBreaker = createCircuitBreaker(getModuleData);

/**
 * Creates html fragment and stores it in the request object.
 * It redirects if something is not right.
 * @param {import('fastify').FastifyRequest} request fastify request object
 * @param {import('fastify').FastifyReply} reply fastify reply object
 * @param {*} opts options
 */
const createRequestHtmlFragment = async (request, reply, { createRoutes }) => {
  try {
    const { store } = request;
    const { dispatch } = store;
    const routes = createRoutes(store);

    const { redirectLocation, renderProps } = await matchPromise({
      routes,
      location: request.url,
    });

    if (redirectLocation) {
      // support redirecting outside our app (i.e. domain/origin)
      // store more than pathname and search as a Url object as redirectLocation.state
      if (redirectLocation.state instanceof Url) {
        reply.redirect(302, url.format(redirectLocation.state));
      } else {
        reply.redirect(302, redirectLocation.pathname + redirectLocation.search);
      }
    } else {
      if (!renderProps) {
        reply.code(404);
        throw new Error('unable to match routes');
      }

      const { httpStatus } = renderProps.routes.slice(-1)[0];

      if (httpStatus) {
        reply.code(httpStatus);
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

      if (getRenderMethodName(state) === 'renderForStaticMarkup') {
        await dispatch(composeModules(routeModules));
      } else {
        const fallback = await getModuleDataBreaker.fire({
          dispatch,
          modules: routeModules,
        });

        if (fallback) {
          request.appHtml = '';
          request.helmetInfo = {};
          return;
        }
      }

      const renderMethod = getRenderMethodName(state) === 'renderForStaticMarkup'
        ? renderForStaticMarkup
        : renderForString;

      /* eslint-disable react/jsx-props-no-spreading */
      const { renderedString, helmetInfo } = renderMethod(
        <Provider store={store}>
          <RouterContext {...renderProps} />
        </Provider>
      );
      /* eslint-ensable react/jsx-props-no-spreading */
      request.appHtml = renderedString;
      request.helmetInfo = helmetInfo;
    }
  } catch (err) {
    console.error(util.format('error creating request HTML fragment for %s', request.url), err);
  }
};

export default createRequestHtmlFragment;
