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

import createSsrFetch, { setCreateSsrFetch } from '../../../src/server/utils/createSsrFetch';

const fetchSpy = jest.fn(() => 'doing some fetching');

describe('createSsrFetch', () => {
  beforeEach(() => {
    fetchSpy.mockClear();
  });

  it('passes through given fetch by default', () => {
    const newFetch = createSsrFetch()(fetchSpy);
    expect(newFetch).toEqual(fetchSpy);
    expect(newFetch()).toEqual('doing some fetching');
  });

  describe('setCreateSsrFetch', () => {
    it('replaces the cached createSsrFetch function', () => {
      const myCreateFetch = jest.fn(() => (nextFetch) => () => `might be ${nextFetch()}`);
      setCreateSsrFetch(myCreateFetch);
      const customFetch = createSsrFetch({ req: { path: '/home' }, res: {} })(fetchSpy);

      expect(myCreateFetch).toHaveBeenCalledWith({ req: { path: '/home' }, res: {} });
      expect(customFetch()).toEqual('might be doing some fetching');
    });

    it('uses default defaultCreateFetch when no arg given', () => {
      const myCreateFetch = jest.fn(() => (nextFetch) => () => `might be ${nextFetch()}`);
      setCreateSsrFetch(myCreateFetch);
      setCreateSsrFetch();
      const customFetch = createSsrFetch({ req: { path: '/home' }, res: {} })(fetchSpy);
      expect(myCreateFetch).not.toHaveBeenCalledWith();
      expect(customFetch()).toEqual('doing some fetching');
    });
  });
});
