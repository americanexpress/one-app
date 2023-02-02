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

import checkStateForStatusCode from '../../../src/server/middleware/checkStateForStatusCode';

describe('checkStateForStatusCode', () => {
  let state = fromJS({ error: { code: null } });
  const req = { store: { getState: () => state } };

  const res = jest.fn();
  res.status = jest.fn(() => res);

  const next = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('should not set the status and go to the next middleware if an error code is not present', () => {
    checkStateForStatusCode(req, res, next);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should not set the status and go to the next middleware if an error is not present', () => {
    state = fromJS({ error: null });
    checkStateForStatusCode(req, res, next);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should set the response status if an error code is present in the state and then go to the next middleware', () => {
    state = fromJS({ error: { code: '500' } });
    checkStateForStatusCode(req, res, next);
    expect(res.status).toHaveBeenCalledWith('500');
    expect(next).toHaveBeenCalled();
  });
});
