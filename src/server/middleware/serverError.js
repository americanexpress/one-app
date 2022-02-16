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

// https://expressjs.com/en/guide/error-handling.html
import { renderStaticErrorPage } from './sendHtml';

// eslint-disable-next-line max-params
const serverError = (err, req, res, next) => {
  const { method, url } = req;
  const correlationId = req.headers && req.headers['correlation-id'];

  const headersSent = !!res.headersSent;

  console.error(err, `express application error: method ${method}, url "${url}", correlationId "${correlationId}", headersSent: ${headersSent}`);

  if (headersSent) {
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
};

export default serverError;
