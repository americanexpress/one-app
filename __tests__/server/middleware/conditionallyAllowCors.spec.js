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

// Dangling underscores are part of the HTTP mocks API
/* eslint-disable no-underscore-dangle */
import httpMocks from 'node-mocks-http';
import { fromJS } from 'immutable';

describe('conditionallyAllowCors', () => {
  const { NODE_ENV } = process.env;
  let conditionallyAllowCors;
  let setCorsOrigins;
  let req;
  let res;
  const next = jest.fn();
  let state = fromJS({ rendering: {} });

  const setup = ({ renderPartialOnly, origin }) => {
    conditionallyAllowCors = require('../../../src/server/middleware/conditionallyAllowCors').default;
    setCorsOrigins = require('../../../src/server/middleware/conditionallyAllowCors').setCorsOrigins;
    state = state.update('rendering', (rendering) => rendering.set('renderPartialOnly', renderPartialOnly));
    req = httpMocks.createRequest({
      headers: {
        Origin: origin,
      },
    });
    req.store = { getState: () => state };
    res = httpMocks.createResponse({ req });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });
  afterAll(() => { process.env.NODE_ENV = NODE_ENV; });

  it('allows CORS for HTML partials', () => {
    setup({ renderPartialOnly: true, origin: 'test.example.com' });
    setCorsOrigins([/\.example.com$/]);
    conditionallyAllowCors(req, res, next);
    expect(next).toHaveBeenCalled();
    const headers = res._getHeaders();
    expect(headers).toHaveProperty('access-control-allow-origin');
  });

  it('allows CORS for localhost in development', () => {
    process.env.NODE_ENV = 'development';
    setup({ renderPartialOnly: true, origin: 'localhost:8000' });
    setCorsOrigins([/\.example.com$/]);
    conditionallyAllowCors(req, res, next);
    expect(next).toHaveBeenCalled();
    const headers = res._getHeaders();
    expect(headers).toHaveProperty('access-control-allow-origin');
  });

  it('does not allow CORS for localhost in production', () => {
    process.env.NODE_ENV = 'production';
    setup({ renderPartialOnly: true, origin: 'localhost:8000' });
    conditionallyAllowCors(req, res, next);
    expect(next).toHaveBeenCalled();
    const headers = res._getHeaders();
    expect(headers).not.toHaveProperty('access-control-allow-origin');
  });

  it('does not allow CORS non-partial requests', () => {
    setup({ renderPartialOnly: false, origin: 'test.example.com' });
    conditionallyAllowCors(req, res, next);
    expect(next).toHaveBeenCalled();
    const headers = res._getHeaders();
    expect(headers).not.toHaveProperty('access-control-allow-origin');
  });
});
