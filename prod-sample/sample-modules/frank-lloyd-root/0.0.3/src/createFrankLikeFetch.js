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

import url from 'url';
import { createBrowserLikeFetch } from '@americanexpress/fetch-enhancers';

const parseHeaders = (req) => ({
  Referer: url.format({
    protocol: req.protocol,
    hostname: req.hostname,
    pathname: req.path,
  }),
  cookie: req.headers.cookie,
});

const createFrankLikeSsrFetch = ({ req, res }) => (fetch) => (fetchUrl, fetchOpts) => {
  res.cookie('createFrankLikeSsrFetch', 'frank-lloyd-root-0.0.3');

  return createBrowserLikeFetch({
    headers: parseHeaders(req),
    hostname: req.hostname,
    res,
    trustedDomains: [/localhost/, /americanexpress\.com/],
  })(fetch)(fetchUrl, fetchOpts);
};

export default createFrankLikeSsrFetch;
