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

import { fromJS } from 'immutable';

import checkStateForRedirect from '../../../src/server/middleware/checkStateForRedirect';

describe('checkStateForRedirect', () => {
  const destination = 'http://example.com/';
  let state = fromJS({ redirection: { destination: null } });
  const req = { store: { getState: () => state } };
  const res = { redirect: jest.fn() };
  const next = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('should redirect if there is a destination', () => {
    state = fromJS({ redirection: { destination } });
    checkStateForRedirect(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith(302, destination);
    expect(next).not.toHaveBeenCalled();
  });

  it('should got to the next middleware if there is no destination', () => {
    state = fromJS({ redirection: { destination: null } });
    checkStateForRedirect(req, res, next);
    expect(res.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
