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

import serverError from '../../../src/server/middleware/serverError';

// existing coverage in ssrServer.spec.js

jest.spyOn(console, 'error').mockImplementation(() => {});
const next = jest.fn();
describe('serverError', () => {
  it('handles req with no headers however unlikely', () => {
    const reqWithNoHeaders = {};
    const res = { status: jest.fn(), send: jest.fn() };

    const callServerError = () => serverError('some error', reqWithNoHeaders, res, next);
    expect(callServerError).not.toThrowError();
  });
});
