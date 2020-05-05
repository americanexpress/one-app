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

// We need to conditionally require in this fault based on whether we are in a
// development or production environment
/* eslint-disable global-require */

import path from 'path';

import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { json } from 'body-parser';
import helmet from 'helmet';
import cors from 'cors';

import conditionallyAllowCors from './middleware/conditionallyAllowCors';
import ensureCorrelationId from './middleware/ensureCorrelationId';
import setAppVersionHeader from './middleware/setAppVersionHeader';
import clientErrorLogger from './middleware/clientErrorLogger';
import oneApp from '../universal';
import addSecurityHeaders from './middleware/addSecurityHeaders';
import addCacheHeaders from './middleware/addCacheHeaders';
import csp from './middleware/csp';
import cspViolation from './middleware/cspViolation';
import addFrameOptionsHeader from './middleware/addFrameOptionsHeader';
import createRequestStore from './middleware/createRequestStore';
import createRequestHtmlFragment from './middleware/createRequestHtmlFragment';
import checkStateForRedirect from './middleware/checkStateForRedirect';
import checkStateForStatusCode from './middleware/checkStateForStatusCode';
import sendHtml, { renderStaticErrorPage } from './middleware/sendHtml';
import logging from './utils/logging/serverMiddleware';
import forwardedHeaderParser from './middleware/forwardedHeaderParser';
import { serviceWorkerMiddleware } from './middleware/pwa';

export function createApp({ enablePostToModuleRoutes = false } = {}) {
  const app = express();

  app.use(ensureCorrelationId);
  app.use(logging);
  app.use(compression());
  app.get('*', addSecurityHeaders);
  app.use(setAppVersionHeader);
  app.use(forwardedHeaderParser);

  app.use('/_/static', express.static(path.join(__dirname, '../../build'), { maxage: '182d' }));
  app.get('/_/pwa/service-worker.js', serviceWorkerMiddleware());
  app.get('*', addCacheHeaders);

  app.disable('x-powered-by');
  app.disable('e-tag');
  app.use(helmet());
  app.use(csp());
  app.use(cookieParser());
  app.use(json({
    type: ['json', 'application/csp-report'],
  }));
  app.post('/_/report/security/csp-violation', cspViolation);
  app.post('/_/report/errors', clientErrorLogger);
  app.get('**/*.(json|js|css|map)', (req, res) => res.sendStatus(404));

  app.get(
    '*',
    addFrameOptionsHeader,
    createRequestStore(oneApp),
    createRequestHtmlFragment(oneApp),
    conditionallyAllowCors,
    checkStateForRedirect,
    checkStateForStatusCode,
    sendHtml
  );

  if (enablePostToModuleRoutes) {
    app.options(
      '*',
      addSecurityHeaders,
      json({ limit: '0kb' }), // there should be no body
      cors({ origin: false }) // disable CORS
    );

    app.post(
      '*',
      addSecurityHeaders,
      json({ limit: '15kb' }),
      addFrameOptionsHeader,
      createRequestStore(oneApp, { useBodyForBuildingTheInitialState: true }),
      createRequestHtmlFragment(oneApp),
      conditionallyAllowCors,
      checkStateForRedirect,
      checkStateForStatusCode,
      sendHtml
    );
  }

  // https://expressjs.com/en/guide/error-handling.html
  // eslint-disable-next-line max-params
  app.use((err, req, res, next) => {
    console.error('express application error', err);

    if (res.headersSent) {
      // don't try changing the headers at this point
      return next(err);
    }

    if (err.name === 'URIError') {
      // invalid URL given to express, unable to parse
      res.status(400);
    } else {
      res.status(500);
    }

    return renderStaticErrorPage(res);
  });

  return app;
}

export default createApp({
  enablePostToModuleRoutes: !!process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES,
});
