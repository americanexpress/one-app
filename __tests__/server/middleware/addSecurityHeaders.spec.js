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

import addSecurityHeaders from '../../../src/server/middleware/addSecurityHeaders';

describe('addSecurityHeaders', () => {
  it('should add all expected security headers', () => {
    const req = { get: jest.fn(), headers: {} };
    const res = { set: jest.fn((key, value) => value) };
    const next = jest.fn();
    addSecurityHeaders(req, res, next);

    const securityHeaders = {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=15552000; includeSubDomains',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'same-origin',
    };
    expect(res.set.mock.calls.length).toEqual(Object.keys(securityHeaders).length);
    Object.keys(securityHeaders).forEach(
      (header) => expect(res.set).toBeCalledWith(header, securityHeaders[header])
    );
    expect(next).toBeCalled();
  });

  describe('Referrer-Policy', () => {
    it('default can be overridden ', () => {
      const req = { get: jest.fn(), headers: {} };
      const res = { set: jest.fn((key, value) => value) };
      process.env.ONE_REFERRER_POLICY_OVERRIDE = 'no-referrer';

      addSecurityHeaders(req, res, jest.fn());
      expect(res.set).toBeCalledWith('Referrer-Policy', 'no-referrer');

      delete process.env.ONE_REFERRER_POLICY_OVERRIDE;
    });
  });
});
