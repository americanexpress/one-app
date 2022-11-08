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

import httpMocks from 'node-mocks-http';
import setAppVersionHeader from '../../../src/server/middleware/setAppVersionHeader';

jest.mock('../../../src/server/utils/readJsonFile', () => () => ({ buildVersion: 'x.0' }));

describe('setAppVersionHeader', () => {
  it('should set the app version header', () => {
    const req = httpMocks.createRequest({
      method: 'GET',
      url: '/any-path',
    });
    const res = httpMocks.createResponse({ req });
    const next = jest.fn();
    setAppVersionHeader(req, res, next);
    // eslint-disable-next-line no-underscore-dangle
    expect(res._getHeaders()).toMatchSnapshot();
  });

  it('should call next', () => {
    const req = httpMocks.createRequest({
      method: 'GET',
      url: '/any-path',
    });
    const res = httpMocks.createResponse({ req });
    const next = jest.fn();
    setAppVersionHeader(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
