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
import { composeModules } from 'holocron';
import match from '../../../src/universal/utils/matchPromisified';
// getBreaker is only added in the mock
/* eslint-disable-next-line import/named */
import { getBreaker } from '../../../src/server/utils/createCircuitBreaker';

import * as reactRendering from '../../../src/server/utils/reactRendering';

jest.mock('../../../src/universal/utils/matchPromisified');

jest.mock('holocron', () => ({
  composeModules: jest.fn(() => 'composeModules'),
  getModule: () => () => 0,
}));

jest.mock('../../../src/server/utils/createCircuitBreaker', () => {
  const breaker = jest.fn();
  const mockCreateCircuitBreaker = (asyncFuntionThatMightFail) => {
    breaker.fire = jest.fn((...args) => {
      asyncFuntionThatMightFail(...args);
      return false;
    });
    return breaker;
  };
  mockCreateCircuitBreaker.getBreaker = () => breaker;
  return mockCreateCircuitBreaker;
});

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
    jest.clearAllMocks();
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
    expect.assertions(4);
    const createRequestHtmlFragment = require(
      '../../../src/server/middleware/createRequestHtmlFragment'
    ).default;
    const middleware = createRequestHtmlFragment({ createRoutes });
    return middleware(req, res, next)
      .then(() => {
        expect(getBreaker().fire).toHaveBeenCalled();
        expect(composeModules).toHaveBeenCalled();
        expect(composeModules.mock.calls[0][0]).toMatchSnapshot();
        expect(dispatch).toHaveBeenCalledWith('composeModules');
      });
  });

  it('should add app HTML to the request object', () => {
    expect.assertions(5);
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
    expect.assertions(5);
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
    expect.assertions(4);
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
    expect.assertions(5);
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
    expect.assertions(3);
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
    expect.assertions(3);
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
    expect.assertions(3);
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

  it('should use a circuit breaker', async () => {
    expect.assertions(6);
    const createRequestHtmlFragment = require(
      '../../../src/server/middleware/createRequestHtmlFragment'
    ).default;
    const middleware = createRequestHtmlFragment({ createRoutes });
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(getBreaker().fire).toHaveBeenCalled();
    expect(composeModules).toHaveBeenCalled();
    expect(renderForStringSpy).toHaveBeenCalled();
    expect(renderForStaticMarkupSpy).not.toHaveBeenCalled();
    expect(req.appHtml).toBe('hi');
  });

  it('should fall back when the circuit opens', async () => {
    expect.assertions(5);
    const createRequestHtmlFragment = require(
      '../../../src/server/middleware/createRequestHtmlFragment'
    ).default;
    const breaker = getBreaker();
    breaker.fire.mockReturnValueOnce(true);
    const middleware = createRequestHtmlFragment({ createRoutes });
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(getBreaker().fire).toHaveBeenCalled();
    expect(renderForStringSpy).not.toHaveBeenCalled();
    expect(renderForStaticMarkupSpy).not.toHaveBeenCalled();
    expect(req.appHtml).toBe('');
  });

  it('should not use the circuit breaker for partials', async () => {
    expect.assertions(6);
    const createRequestHtmlFragment = require(
      '../../../src/server/middleware/createRequestHtmlFragment'
    ).default;
    const middleware = createRequestHtmlFragment({ createRoutes });
    getState.mockImplementationOnce(() => fromJS({
      rendering: {
        renderPartialOnly: true,
      },
    }));
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(getBreaker().fire).not.toHaveBeenCalled();
    expect(composeModules).toHaveBeenCalled();
    expect(renderForStringSpy).not.toHaveBeenCalled();
    expect(renderForStaticMarkupSpy).toHaveBeenCalled();
    expect(req.appHtml).toBe('hi');
  });

  it('should not use the circuit breaker when scripts are disabled', async () => {
    expect.assertions(6);
    const createRequestHtmlFragment = require(
      '../../../src/server/middleware/createRequestHtmlFragment'
    ).default;
    const middleware = createRequestHtmlFragment({ createRoutes });
    getState.mockImplementationOnce(() => fromJS({
      rendering: {
        disableScripts: true,
      },
    }));
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(getBreaker().fire).not.toHaveBeenCalled();
    expect(composeModules).toHaveBeenCalled();
    expect(renderForStringSpy).not.toHaveBeenCalled();
    expect(renderForStaticMarkupSpy).toHaveBeenCalled();
    expect(req.appHtml).toBe('hi');
  });
});
