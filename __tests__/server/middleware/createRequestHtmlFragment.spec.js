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

import url from 'url';
import { browserHistory } from '@americanexpress/one-app-router';
import { Map as iMap, fromJS } from 'immutable';
import match from '../../../src/universal/utils/matchPromisified';

import * as reactRendering from '../../../src/server/utils/reactRendering';

jest.mock('../../../src/universal/utils/matchPromisified');

jest.mock('holocron', () => ({
  composeModules: jest.fn(() => 'composeModules'),
}));

const renderForStringSpy = jest.spyOn(reactRendering, 'renderForString');
const renderForStaticMarkupSpy = jest.spyOn(reactRendering, 'renderForStaticMarkup');

describe('createRequestHtmlFragment', () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});

  let req;
  let res;
  let next;
  let createRoutes;
  const dispatch = jest.fn((x) => x);
  const getState = jest.fn(() => fromJS({
    rendering: iMap({}),
  }));

  beforeAll(() => {
    match.mockImplementation(({ routes, location }) => Promise.resolve({
      redirectLocation: undefined,
      renderProps: {
        routes,
        components: [() => 'hi'],
        // history: browserHistory,
        location: url.parse(location),
        router: browserHistory,
        params: {
          hi: 'there?',
        },
      },
    }));
  });

  beforeEach(() => {
    req = jest.fn();
    req.headers = {};

    res = jest.fn();
    res.status = jest.fn(() => res);
    res.sendStatus = jest.fn(() => res);
    res.redirect = jest.fn(() => res);
    res.end = jest.fn(() => res);
    req.url = 'http://example.com/request';
    req.store = { dispatch, getState };

    next = jest.fn();

    createRoutes = jest.fn(() => [{ path: '/', moduleName: 'root' }]);

    renderForStringSpy.mockClear();
    renderForStaticMarkupSpy.mockClear();
  });

  it('returns a function', () => {
    const createRequestHtmlFragment = require(
      '../../../src/server/middleware/createRequestHtmlFragment'
    ).default;
    const middleware = createRequestHtmlFragment({ createRoutes });
    expect(middleware).toBeInstanceOf(Function);
  });

  it('should preload data for matched route components', () => {
    const createRequestHtmlFragment = require(
      '../../../src/server/middleware/createRequestHtmlFragment'
    ).default;
    const middleware = createRequestHtmlFragment({ createRoutes });
    return middleware(req, res, next)
      .then(() => {
        const { composeModules } = require('holocron');
        expect(composeModules).toHaveBeenCalled();
        expect(composeModules.mock.calls[0][0]).toMatchSnapshot();
        expect(dispatch).toHaveBeenCalledWith('composeModules');
      });
  });

  it('should add app HTML to the request object', () => {
    const createRequestHtmlFragment = require(
      '../../../src/server/middleware/createRequestHtmlFragment'
    ).default;
    const middleware = createRequestHtmlFragment({ createRoutes });
    return middleware(req, res, next)
      .then(() => {
        expect(next).toHaveBeenCalled();
        expect(createRoutes).toHaveBeenCalledWith(req.store);
        expect(renderForStringSpy).toHaveBeenCalled();
        expect(renderForStaticMarkupSpy).not.toHaveBeenCalled();
        expect(typeof req.appHtml).toBe('string');
      });
  });

  it('should add app HTML as static markup to the request object when scripts are disabled', () => {
    const createRequestHtmlFragment = require(
      '../../../src/server/middleware/createRequestHtmlFragment'
    ).default;
    const middleware = createRequestHtmlFragment({ createRoutes });
    getState.mockImplementationOnce(() => fromJS({
      rendering: iMap({ disableScripts: true }),
    }));
    return middleware(req, res, next)
      .then(() => {
        expect(next).toHaveBeenCalled();
        expect(createRoutes).toHaveBeenCalledWith(req.store);
        expect(renderForStringSpy).not.toHaveBeenCalled();
        expect(renderForStaticMarkupSpy).toHaveBeenCalled();
        expect(typeof req.appHtml).toBe('string');
      });
  });

  it('should set the custom HTTP status', () => {
    const createRequestHtmlFragment = require(
      '../../../src/server/middleware/createRequestHtmlFragment'
    ).default;

    createRoutes = jest.fn(() => [{ path: '/', httpStatus: 400 }]);
    const middleware = createRequestHtmlFragment({ createRoutes });
    return middleware(req, res, next)
      .then(() => {
        expect(next).toHaveBeenCalled();
        expect(createRoutes).toHaveBeenCalledWith(req.store);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(typeof req.appHtml).toBe('string');
      });
  });

  it('does not generate HTML when no route is matched', () => {
    const createRequestHtmlFragment = require(
      '../../../src/server/middleware/createRequestHtmlFragment'
    ).default;

    match.mockImplementationOnce(() => ({
      redirectLocation: undefined,
      // omit renderProps
    }));

    const middleware = createRequestHtmlFragment({ createRoutes });
    // eslint-disable-next-line no-console
    console.error = jest.fn();
    return middleware(req, res, next)
      .then(() => {
        // eslint-disable-next-line no-console
        expect(console.error).toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
        expect(res.sendStatus).toHaveBeenCalledWith(404);
        expect(createRoutes).toHaveBeenCalledWith(req.store);
        expect(req.appHtml).toBe(undefined);
      });
  });

  it('redirects when a relative redirect route is matched', () => {
    const createRequestHtmlFragment = require(
      '../../../src/server/middleware/createRequestHtmlFragment'
    ).default;

    match.mockImplementationOnce(() => ({
      redirectLocation: {
        pathname: '/redirect',
        search: '',
      },
    }));

    const middleware = createRequestHtmlFragment({ createRoutes });
    return middleware(req, res, next)
      .then(() => {
        expect(createRoutes).toHaveBeenCalledWith(req.store);
        expect(res.redirect).toHaveBeenCalledWith(302, '/redirect');
        expect(req.appHtml).toBe(undefined);
      });
  });

  it('redirects when an absolute redirect route is matched', () => {
    const createRequestHtmlFragment = require(
      '../../../src/server/middleware/createRequestHtmlFragment'
    ).default;

    match.mockImplementationOnce(() => ({
      redirectLocation: {
        state: url.parse('https://example.com/redirect'),
      },
    }));

    const middleware = createRequestHtmlFragment({ createRoutes });
    return middleware(req, res, next)
      .then(() => {
        expect(createRoutes).toHaveBeenCalledWith(req.store);
        expect(res.redirect).toHaveBeenCalledWith(302, 'https://example.com/redirect');
        expect(req.appHtml).toBe(undefined);
      });
  });

  it('should catch any errors and call the next middleware', () => {
    const createRequestHtmlFragment = require(
      '../../../src/server/middleware/createRequestHtmlFragment'
    ).default;

    delete req.store;
    const middleware = createRequestHtmlFragment({ createRoutes: null });
    /* eslint-disable no-console */
    console.error = jest.fn();
    middleware(req, res, next);
    expect(console.error).toHaveBeenCalled();
    expect(console.error.mock.calls[0]).toMatchSnapshot();
    expect(next).toHaveBeenCalled();
    /* eslint-enable no-console */
  });
});
