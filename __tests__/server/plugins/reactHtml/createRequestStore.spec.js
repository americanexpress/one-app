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
import { fromJS } from 'immutable';
import renderStaticErrorPage from '../../../../src/server/plugins/reactHtml/staticErrorPage';
import createRequestStore from '../../../../src/server/plugins/reactHtml/createRequestStore';
import { setClientModuleMapCache } from '../../../../src/server/utils/clientModuleMapCache';

jest.mock('../../../../src/server/plugins/reactHtml/staticErrorPage');
jest.mock('holocron', () => {
  const actualHolocron = jest.requireActual('holocron');
  return {
    ...actualHolocron,
    createHolocronStore: jest.fn(actualHolocron.createHolocronStore),
    getModuleMap: jest.fn(),
  };
});

holocron.getModuleMap.mockImplementation(() => fromJS({
  modules: {
    'test-root': {
      baseUrl: 'https://example.com/cdn/test-root/2.2.2/',
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
  let request;
  let reply;
  let reducers;
  const span = { end: jest.fn() };
  const tracer = { startSpan: jest.fn(() => span) };

  beforeAll(() => {
    global.fetch = () => Promise.resolve({ data: 'data' });
    holocron.createHolocronStore.mockClear();
  });

  afterAll(() => {
    global.fetch = undefined;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    request = {
      openTelemetry: () => ({ tracer }),
      decorateRequest: jest.fn(),
      headers: {
        'correlation-id': 'abc123',
      },
      url: '/',
      raw: {},
      method: 'get',
      log: { error: jest.fn() },
    };

    reply = {
      raw: {},
    };

    reducers = jest.fn(
      (...args) => combineReducers({
        appReducer: jest.fn((v) => v || true),
        config: jest.fn((v) => v || true),
      })(...args)
    );
    reducers.buildInitialState = jest.fn(() => fromJS({ appReducer: 'fizzy' }));
  });

  it('should add a store to the request object', () => {
    createRequestStore(request, reply, { reducers });

    expect(request.log.error).not.toHaveBeenCalled();
    expect(request.store).toBeTruthy();
  });

  it('should add the client holocron module map cache to the request object', () => {
    createRequestStore(request, reply, { reducers });

    expect(request.clientModuleMapCache).toMatchSnapshot();
  });

  it('should send the static error page when there is an error', () => {
    createRequestStore(request, reply, { reducers: null });

    expect(request.log.error).toHaveBeenCalled();
    expect(renderStaticErrorPage).toHaveBeenCalledWith(request, reply);
  });

  describe('fetch', () => {
    it('should set the store up with fetchClient', async () => {
      createRequestStore(request, reply, { reducers });
      const {
        extraThunkArguments: { fetchClient },
      } = holocron.createHolocronStore.mock.calls[0][0];

      expect(fetchClient).toBeInstanceOf(Function);
    });
  });

  describe('useBodyForBuildingTheInitialState', () => {
    it('uses the request body as the locals for initial state when useBodyForBuildingTheInitialState is true', () => {
      request.method = 'post';
      request.body = { some: 'form data', that: 'was posted' };

      createRequestStore(request, reply, { reducers });

      expect(reducers.buildInitialState).toHaveBeenCalledTimes(1);
      expect(reducers.buildInitialState.mock.calls[0][0]).toHaveProperty('req.body.some', 'form data');
      expect(reducers.buildInitialState.mock.calls[0][0]).toHaveProperty('req.body.that', 'was posted');
    });

    it('does not use the request body as the locals for initial state when useBodyForBuildingTheInitialState is not given', () => {
      request.body = { some: 'other form data', that: 'was acquired' };
      createRequestStore(request, reply, { reducers });

      expect(reducers.buildInitialState).toHaveBeenCalledTimes(1);
      expect(reducers.buildInitialState.mock.calls[0][0]).not.toHaveProperty('req.body');
    });
  });

  it('should pass enhancedFetch into createHolocronStore', () => {
    createRequestStore(request, reply, { reducers });

    expect(holocron.createHolocronStore.mock.calls[0][0]).toHaveProperty('extraThunkArguments.fetchClient');
  });

  describe('tracer', () => {
    it('should create a span', () => {
      createRequestStore(request, reply, { reducers });

      expect(tracer.startSpan).toHaveBeenCalledWith('createRequestStore');
      expect(span.end).toHaveBeenCalled();
    });

    it('should still end the span if an error is thrown', () => {
      createRequestStore(request, reply, { reducers: null });

      expect(tracer.startSpan).toHaveBeenCalledWith('createRequestStore');
      expect(request.log.error).toHaveBeenCalled();
      expect(renderStaticErrorPage).toHaveBeenCalledWith(request, reply);
      expect(span.end).toHaveBeenCalled();
    });
  });
});
