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

import combineReducers from '@americanexpress/vitruvius/immutable';
import holocron from 'holocron';
import httpMocks from 'node-mocks-http';
import { fromJS } from 'immutable';
import { renderStaticErrorPage } from '../../../src/server/middleware/sendHtml';
import createRequestStore from '../../../src/server/middleware/createRequestStore';
import { setClientModuleMapCache } from '../../../src/server/utils/clientModuleMapCache';

jest.mock('../../../src/server/middleware/sendHtml');
jest.mock('holocron', () => {
  const actualHolocron = require.requireActual('holocron');
  return {
    ...actualHolocron,
    createHolocronStore: jest.fn(actualHolocron.createHolocronStore),
    getModuleMap: jest.fn(),
  };
});

holocron.getModuleMap.mockImplementation(() => fromJS({
  modules: {
    'test-root': {
      node: {
        url: 'https://example.com/cdn/test-root/2.2.2/test-root.node.js',
        integrity: '4y45hr',
      },
      browser: {
        url: 'https://example.com/cdn/test-root/2.2.2/test-root.browser.js',
        integrity: 'nggdfhr34',
      },
      legacyBrowser: {
        url: 'https://example.com/cdn/test-root/2.2.2/test-root.legacy.browser.js',
        integrity: '7567ee',
      },
    },
  },
}));

setClientModuleMapCache(holocron.getModuleMap().toJS());

describe('createRequestStore', () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  let req;
  let res;
  let next;
  let reducers;

  beforeAll(() => {
    global.fetch = () => Promise.resolve({ data: 'data' });
    holocron.createHolocronStore.mockClear();
  });

  afterAll(() => {
    global.fetch = undefined;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest({
      headers: {
        'correlation-id': 'abc123',
      },
    });
    res = httpMocks.createResponse({ req });

    res.status = jest.fn(res.status);
    res.send = jest.fn(res.send);
    res.end = jest.fn(res.end);
    res.cookie = jest.fn(res.cookie);

    next = jest.fn();

    reducers = jest.fn(
      (...args) => combineReducers({
        appReducer: jest.fn((v) => v || true),
        config: jest.fn((v) => v || true),
      })(...args)
    );
    reducers.buildInitialState = jest.fn(() => fromJS({ appReducer: 'fizzy' }));
  });

  it('returns a function', () => {
    const middleware = createRequestStore({ reducers });
    expect(middleware).toBeInstanceOf(Function);
  });

  it('should add a store to the request object', () => {
    const middleware = createRequestStore({ reducers });
    middleware(req, res, next);
    expect(req.store).toBeTruthy();
    expect(next).toHaveBeenCalled();
  });

  it('should add the client holocron module map cache to the request object', () => {
    const middleware = createRequestStore({ reducers });
    middleware(req, res, next);
    expect(req.clientModuleMapCache).toMatchSnapshot();
    expect(next).toHaveBeenCalled();
  });

  it('should send the static error page when there is an error', () => {
    const middleware = createRequestStore({ reducers: null });
    middleware(req, res, next);
    // eslint-disable-next-line no-console
    expect(console.error).toHaveBeenCalled();
    expect(renderStaticErrorPage).toHaveBeenCalledWith(res);
  });

  describe('fetch', () => {
    it('should set the store up with fetchClient', async () => {
      const middleware = createRequestStore({ reducers });
      middleware(req, res, next);
      const {
        extraThunkArguments: { fetchClient },
      } = holocron.createHolocronStore.mock.calls[0][0];
      expect(fetchClient).toBeInstanceOf(Function);
    });
  });

  describe('useBodyForBuildingTheInitialState', () => {
    it('uses the request body as the locals for initial state when useBodyForBuildingTheInitialState is true', () => {
      const middleware = createRequestStore(
        { reducers },
        { useBodyForBuildingTheInitialState: true }
      );
      req.body = { some: 'form data', that: 'was posted' };
      middleware(req, res, next);
      expect(reducers.buildInitialState).toHaveBeenCalledTimes(1);
      expect(reducers.buildInitialState.mock.calls[0][0]).toHaveProperty('req.body.some', 'form data');
      expect(reducers.buildInitialState.mock.calls[0][0]).toHaveProperty('req.body.that', 'was posted');
    });

    it('does not use the request body as the locals for initial state when useBodyForBuildingTheInitialState is not given', () => {
      const middleware = createRequestStore({ reducers });
      req.body = { some: 'other form data', that: 'was acquired' };
      middleware(req, res, next);
      expect(reducers.buildInitialState).toHaveBeenCalledTimes(1);
      expect(reducers.buildInitialState.mock.calls[0][0]).not.toHaveProperty('req.body');
    });
  });

  it('should pass enhancedFetch into createHolocronStore', () => {
    createRequestStore({ reducers })(req, res, next);
    expect(holocron.createHolocronStore.mock.calls[0][0]).toHaveProperty('extraThunkArguments.fetchClient');
  });
});
