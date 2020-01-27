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

import cors from 'cors';

const devOrigin = /localhost:\d{1,5}/;
const corsOptions = {
  origin: [],
};

export const setCorsOrigins = (newCorsOrigins = []) => {
  corsOptions.origin = process.env.NODE_ENV === 'development'
    ? [...newCorsOrigins, devOrigin]
    : newCorsOrigins;
};

setCorsOrigins();

export default function conditionallyAllowCors(req, res, next) {
  const renderPartialOnly = req.store.getState().getIn(['rendering', 'renderPartialOnly']);

  // The HTML partials will have CORS enabled so they can be loaded client-side
  if (renderPartialOnly) {
    return cors(corsOptions)(req, res, next);
  }

  return cors({ origin: false })(req, res, next);
}
