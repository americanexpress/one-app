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

import addCacheHeaders from '../../../src/server/middleware/addCacheHeaders';

describe('addCacheHeaders', () => {
  it('should add all expected cache headers', () => {
    const req = { get: jest.fn(), headers: {} };
    const res = { set: jest.fn((key, value) => value) };
    const next = jest.fn();
    addCacheHeaders(req, res, next);

    const cacheHeaders = {
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    };
    expect(res.set.mock.calls.length).toEqual(Object.keys(cacheHeaders).length);
    Object.keys(cacheHeaders).forEach(
      (header) => expect(res.set).toBeCalledWith(header, cacheHeaders[header])
    );
    expect(next).toBeCalled();
  });
});
