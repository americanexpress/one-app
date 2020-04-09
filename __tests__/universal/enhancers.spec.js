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

import { createStore, compose } from 'redux';
import { MODULE_LOADED } from 'holocron/ducks/constants';

import createEnhancer from '../../src/universal/enhancers';

const mockMiddlewareSpy = jest.fn();
function createMockMiddleware(type) {
  return () => (next) => (action) => {
    mockMiddlewareSpy(type);
    next(action);
  };
}

describe('enhancers', () => {
  it('should create an enhancer that applies extra middleware if provided', () => {
    const extraMiddleware = createMockMiddleware('extra');
    const enhancer = createEnhancer([extraMiddleware]);
    const store = createStore((state) => state, enhancer);
    store.dispatch({ type: 'SOME_ACTION', data: 'data' });
    expect(mockMiddlewareSpy).toHaveBeenCalledWith('extra');
  });

  describe('redux dev tools', () => {
    afterEach(() => {
      process.env.NODE_ENV = undefined;
      global.BROWSER = undefined;
      // eslint-disable-next-line no-underscore-dangle
      global.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = undefined;
    });

    it('should set up redux dev tools for development', () => {
      process.env.NODE_ENV = 'development';
      global.BROWSER = true;
      // eslint-disable-next-line no-underscore-dangle
      window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = jest.fn((x) => compose(x));

      const enhancer = createEnhancer();
      const store = createStore((state) => state, enhancer);
      store.dispatch({ type: 'SOME_ACTION', data: 'data' });

      expect(mockMiddlewareSpy).toHaveBeenCalled();
    });

    it('should gracefully fallback if dev tools are not present', () => {
      process.env.NODE_ENV = 'development';
      global.BROWSER = true;
      const enhancer = createEnhancer();
      const store = createStore((state) => state, enhancer);
      store.dispatch({ type: 'SOME_ACTION', data: 'data' });

      expect(mockMiddlewareSpy).toHaveBeenCalled();
    });
  });

  describe('assumptions', () => {
    it('expects holocron to export a MODULE_LOADED action type', () => {
      expect(MODULE_LOADED).toEqual(expect.any(String));
    });
  });
});
