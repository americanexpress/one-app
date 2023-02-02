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

import forwardedHeaderParser from '../../../src/server/middleware/forwardedHeaderParser';

describe('forwardedHeaderParser', () => {
  function generateSamples() {
    const req = {
      headers: {},
    };
    const res = null;
    const next = jest.fn();
    return { req, res, next };
  }

  it('no req.forwarded when no forwarded header is present', () => {
    const { req, res, next } = generateSamples();
    delete req.headers.forwarded;
    forwardedHeaderParser(req, res, next);
    expect(req.forwarded).not.toBeDefined();
  });

  it('forwarded header string is converted into an object - forwarded.host does not exist', () => {
    const { req, res, next } = generateSamples();
    delete req.headers.forwarded;
    req.headers.forwarded = 'by=testby;for=testfor;proto=testproto';
    forwardedHeaderParser(req, res, next);
    expect(req.forwarded).toBeDefined();
    expect(req.forwarded).toEqual({
      by: 'testby',
      for: 'testfor',
      proto: 'testproto',
    });
  });

  it('forwarded header string is converted into an object - forwarded.host exists', () => {
    const { req, res, next } = generateSamples();
    delete req.headers.forwarded;
    req.headers.forwarded = 'by=testby;for=testfor;host=testhost;proto=testproto';
    forwardedHeaderParser(req, res, next);
    expect(req.forwarded).toBeDefined();
    expect(req.forwarded).toEqual({
      by: 'testby',
      for: 'testfor',
      host: 'testhost',
      proto: 'testproto',
    });
  });
});
