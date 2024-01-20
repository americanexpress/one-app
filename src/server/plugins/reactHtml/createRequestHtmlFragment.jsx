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

import createCircuitBreaker from '../../utils/createCircuitBreaker';
import { isRedirectUrlAllowed } from '../../utils/redirectAllowList';
import {
  startSummaryTimer,
  ssr as ssrMetrics,
} from '../../metrics';
import {
  getRenderMethodName,
  renderForStaticMarkup,
  renderForString,
} from '../../utils/reactRendering';

import renderStaticErrorPage from './staticErrorPage';

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

/**
 * Creates html fragment and stores it in the request object.
 * It redirects if something is not right.
 * @param {import('fastify').FastifyRequest} request fastify request object
 * @param {import('fastify').FastifyReply} reply fastify reply object
 * @param {*} opts options
 */
const createRequestHtmlFragment = async (request, reply, { createRoutes }) => {
  const { tracer } = request.openTelemetry();

  // eslint-disable-next-line complexity
  return tracer.startActiveSpan('createRequestHtmlFragment', async (parentSpan) => {
    try {
      const createRoutesSpan = tracer.startSpan(`${parentSpan.name} -> createRoutes`, { attributes: { phase: 3 } });
      const { store } = request;
      const { dispatch } = store;
      const routes = createRoutes(store);
      createRoutesSpan.end();

      const checkRoutesSpan = tracer.startSpan(`${parentSpan.name} -> checkRoutes`, { attributes: { phase: 4 } });
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
        checkRoutesSpan.end();
      } else {
        if (!renderProps) {
          reply.code(404);
          checkRoutesSpan.end();
          throw new Error('unable to match routes');
        }
        checkRoutesSpan.end();

        const buildRenderPropsSpan = tracer.startSpan(`${parentSpan.name} -> buildRenderProps`, { attributes: { phase: 5 } });
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
        buildRenderPropsSpan.end();

        const loadModuleDataSpan = tracer.startSpan(`${parentSpan.name} -> loadModuleData`, { attributes: { phase: 6 } });
        if (getRenderMethodName(state) === 'renderForStaticMarkup') {
          await dispatch(composeModules(routeModules));
        } else {
          const { fallback, redirect } = await getModuleDataBreaker.fire({
            dispatch,
            modules: routeModules,
          });

          if (redirect) {
            if (!isRedirectUrlAllowed(redirect.url)) {
              renderStaticErrorPage(request, reply);
              throw new Error(`'${redirect.url}' is not an allowed redirect URL`);
            }
            const status = redirect.status || 302;
            reply.redirect(status, redirect.url);
            loadModuleDataSpan.end();
            return;
          }

          if (fallback) {
            request.appHtml = '';
            request.helmetInfo = {};
            loadModuleDataSpan.end();
            return;
          }
        }
        loadModuleDataSpan.end();

        const renderToStringSpan = tracer.startSpan(`${parentSpan.name} -> renderToString`, { attributes: { phase: 7 } });
        const renderMethod = getRenderMethodName(state) === 'renderForStaticMarkup'
          ? renderForStaticMarkup
          : renderForString;

        const finishRenderTimer = startSummaryTimer(
          ssrMetrics.reactRendering,
          { renderMethodName: getRenderMethodName(state) }
        );
        /* eslint-disable react/jsx-props-no-spreading */
        const { renderedString, helmetInfo } = renderMethod(
          <Provider store={store}>
            <RouterContext {...renderProps} />
          </Provider>
        );
        /* eslint-ensable react/jsx-props-no-spreading */
        finishRenderTimer();

        request.appHtml = renderedString;
        request.helmetInfo = helmetInfo;
        renderToStringSpan.end();
      }
    } catch (err) {
      request.log.error('error creating request HTML fragment for %s', request.url, err);
    } finally {
      parentSpan.end();
    }
  });
};

export default createRequestHtmlFragment;
