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

import addCacheHeaders from '../../../src/server/plugins/addCacheHeaders';

describe('addCacheHeaders', () => {
  it('adds cache headers', () => {
    const request = {
      method: 'get',
    };
    const reply = {
      header: jest.fn(),
    };
    const fastify = {
      addHook: jest.fn(async (_hook, cb) => {
        await cb(request, reply);
      }),
    };
    const done = jest.fn();

    addCacheHeaders(fastify, null, done);

    expect(fastify.addHook).toHaveBeenCalled();
    expect(done).toHaveBeenCalled();
    expect(reply.header).toHaveBeenCalledTimes(2);
    expect(reply.header).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(reply.header).toHaveBeenCalledWith('Pragma', 'no-cache');
  });

  it('does not add cache headers', () => {
    const request = {
      method: 'post',
    };
    const reply = {
      header: jest.fn(),
    };
    const fastify = {
      addHook: jest.fn(async (_hook, cb) => {
        await cb(request, reply);
      }),
    };
    const done = jest.fn();

    addCacheHeaders(fastify, null, done);

    expect(fastify.addHook).toHaveBeenCalled();
    expect(done).toHaveBeenCalled();
    expect(reply.header).not.toHaveBeenCalled();
  });
});
