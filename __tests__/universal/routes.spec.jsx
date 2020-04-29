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

import ReactTestUtils from 'react-dom/test-utils';
import { fromJS } from 'immutable';

import createRoutes from '../../src/universal/routes';

jest.mock('holocron-module-route', () => () => null);
jest.mock('@americanexpress/one-app-ducks/lib/errorReporting', () => ({
  addErrorToReport: jest.fn((error, meta) => ({
    type: 'ADD_ERROR_TO_REPORT',
    error,
    meta,
  })),
}));

describe('routes', () => {
  const store = {
    getState: () => fromJS({
      config: {
        rootModuleName: 'fakeRootModule',
      },
    }),
    dispatch: jest.fn((action) => {
      if (typeof action === 'function') {
        action(store.dispatch);
      }
    }),
  };

  beforeEach(() => jest.clearAllMocks());

  it('should set up the root module route first', () => {
    const RootRoute = createRoutes(store)[0];
    expect(ReactTestUtils.isElement(RootRoute)).toBe(true);
    expect(RootRoute.props).toEqual({ moduleName: 'fakeRootModule', store });
  });

  it('should not define a path on the root module', () => {
    const RootRoute = createRoutes(store)[0];
    expect(RootRoute.props.path).toBe(undefined);
  });

  it('should set up a default 404', () => {
    const NotFoundRoute = createRoutes(store)[1];
    expect(ReactTestUtils.isElement(NotFoundRoute)).toBe(true);
    expect(NotFoundRoute.props).toEqual({
      path: '*',
      component: expect.any(Function),
      onEnter: expect.any(Function),
      onLeave: expect.any(Function),
    });
  });

  it('should display a simple message on 404', () => {
    const NotFoundRoute = createRoutes(store)[1];
    expect(NotFoundRoute.props.component()).toBe('Not found');
  });

  it('should set the status to 404', () => {
    const NotFoundRoute = createRoutes(store)[1];
    NotFoundRoute.props.onEnter({ location: { pathname: 'missing' } });
    expect(store.dispatch.mock.calls[1][0]).toMatchSnapshot({ error: expect.any(Error) });
    expect(store.dispatch.mock.calls[2][0]).toMatchSnapshot();
  });

  it('should clear the 404 status when leaving the unmatched route', () => {
    const NotFoundRoute = createRoutes(store)[1];
    NotFoundRoute.props.onLeave();
    expect(store.dispatch.mock.calls[0][0]).toMatchSnapshot();
  });
});
