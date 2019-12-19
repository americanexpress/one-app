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

import addFrameOptionsHeader from '../../../src/server/middleware/addFrameOptionsHeader';

jest.mock('../../../src/server/middleware/csp', () => ({
  getCSP: () => ({
    'frame-ancestors': ['*.example.com'],
  }),
}));

describe('addFrameOptionsHeader', () => {
  let req;

  const set = jest.fn((key, value) => value);
  const res = { set };
  const next = jest.fn();

  beforeEach(() => {
    set.mockClear();
    next.mockClear();
  });

  it('should add X-Frame-Options ALLOW-FROM header on approved ancestor', () => {
    req = {
      get: jest.fn(() => 'https://external.example.com/embedded'),
    };
    addFrameOptionsHeader(req, res, next);

    expect(req.get).toHaveBeenCalledWith('Referer');
    expect(res.set).toBeCalledWith(
      'X-Frame-Options',
      'ALLOW-FROM https://external.example.com/embedded'
    );
    expect(next).toBeCalled();
  });

  it('should not add X-Frame-Options ALLOW-FROM header on unapproved ancestor', () => {
    req = {
      get: jest.fn(() => 'https://example.com/embedded'),
    };
    addFrameOptionsHeader(req, res, next);

    expect(res.set).not.toHaveBeenCalled();
    expect(next).toBeCalled();
  });
});
