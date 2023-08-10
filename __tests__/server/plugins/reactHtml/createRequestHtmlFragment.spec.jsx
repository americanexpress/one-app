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
import { browserHistory, matchPromise } from '@americanexpress/one-app-router';
import { Map as iMap, fromJS } from 'immutable';
import { composeModules } from 'holocron';
// eslint-disable-next-line import/named -- getBreaker is only added in the mock
import { getBreaker } from '../../../../src/server/utils/createCircuitBreaker';

import * as reactRendering from '../../../../src/server/utils/reactRendering';

jest.spyOn(console, 'error').mockImplementation(() => 0);

jest.mock('@americanexpress/one-app-router', () => ({
  ...jest.requireActual('@americanexpress/one-app-router'),
  matchPromise: jest.fn(),
}));

jest.mock('holocron', () => ({
  composeModules: jest.fn(() => 'composeModules'),
  getModule: () => () => 0,
}));

jest.mock('../../../../src/server/utils/createCircuitBreaker', () => {
  const breaker = jest.fn();
  const mockCreateCircuitBreaker = (asyncFunctionThatMightFail) => {
    breaker.fire = jest.fn(async (...args) => asyncFunctionThatMightFail(...args));
    return breaker;
  };
  mockCreateCircuitBreaker.getBreaker = () => breaker;
  return mockCreateCircuitBreaker;
});

const renderForStringSpy = jest.spyOn(reactRendering, 'renderForString');
const renderForStaticMarkupSpy = jest.spyOn(reactRendering, 'renderForStaticMarkup');

describe('createRequestHtmlFragment', () => {
  let req;
  let res;
  let createRoutes;
  const dispatch = jest.fn((x) => x);
  const getState = jest.fn(() => fromJS({
    rendering: iMap({}),
  }));

  beforeAll(() => {
    matchPromise.mockImplementation(({ routes, location }) => Promise.resolve({
      redirectLocation: undefined,
      renderProps: {
        routes,
        components: [() => 'hi'],
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
    req.log = { error: jest.fn() };
    req.headers = {};

    res = jest.fn();
    res.status = jest.fn(() => res);
    res.sendStatus = jest.fn(() => res);
    res.redirect = jest.fn(() => res);
    res.end = jest.fn(() => res);
    res.code = jest.fn();
    req.url = 'http://example.com/request';
    req.store = { dispatch, getState };

    createRoutes = jest.fn(() => [{ path: '/', moduleName: 'root' }]);

    renderForStringSpy.mockClear();
    renderForStaticMarkupSpy.mockClear();
    req.log.error.mockClear();
  });

  const requireCreateRequestHtmlFragment = (...args) => require(
    '../../../../src/server/plugins/reactHtml/createRequestHtmlFragment'
  ).default(...args);

  it('should preload data for matched route components', async () => {
    expect.assertions(4);

    await requireCreateRequestHtmlFragment(req, res, { createRoutes });

    expect(getBreaker().fire).toHaveBeenCalled();
    expect(composeModules).toHaveBeenCalled();
    expect(composeModules.mock.calls[0][0]).toMatchSnapshot();
    expect(dispatch).toHaveBeenCalledWith('composeModules');
  });

  it('should add app HTML to the request object', async () => {
    expect.assertions(4);

    await requireCreateRequestHtmlFragment(req, res, { createRoutes });

    expect(createRoutes).toHaveBeenCalledWith(req.store);
    expect(renderForStringSpy).toHaveBeenCalled();
    expect(renderForStaticMarkupSpy).not.toHaveBeenCalled();
    expect(typeof req.appHtml).toBe('string');
  });

  it('should add app HTML as static markup to the request object when scripts are disabled', async () => {
    expect.assertions(4);

    getState.mockImplementationOnce(() => fromJS({
      rendering: iMap({ disableScripts: true }),
    }));

    await requireCreateRequestHtmlFragment(req, res, { createRoutes });

    expect(createRoutes).toHaveBeenCalledWith(req.store);
    expect(renderForStringSpy).not.toHaveBeenCalled();
    expect(renderForStaticMarkupSpy).toHaveBeenCalled();
    expect(typeof req.appHtml).toBe('string');
  });

  it('should set the custom HTTP status', async () => {
    expect.assertions(3);

    createRoutes = jest.fn(() => [{ path: '/', httpStatus: 400 }]);
    await requireCreateRequestHtmlFragment(req, res, { createRoutes });

    expect(createRoutes).toHaveBeenCalledWith(req.store);
    expect(res.code).toHaveBeenCalledWith(400);
    expect(typeof req.appHtml).toBe('string');
  });

  it('does not generate HTML when no route is matched', async () => {
    expect.assertions(4);

    matchPromise.mockImplementationOnce(() => ({
      redirectLocation: undefined,
      // omit renderProps
    }));

    await requireCreateRequestHtmlFragment(req, res, { createRoutes });

    expect(req.log.error).toHaveBeenCalledWith('error creating request HTML fragment for %s', 'http://example.com/request', expect.any(Error));
    expect(res.code).toHaveBeenCalledWith(404);
    expect(createRoutes).toHaveBeenCalledWith(req.store);
    expect(req.appHtml).toBe(undefined);
  });

  it('redirects when a relative redirect route is matched', async () => {
    expect.assertions(3);

    matchPromise.mockImplementationOnce(() => ({
      redirectLocation: {
        pathname: '/redirect',
        search: '',
      },
    }));

    await requireCreateRequestHtmlFragment(req, res, { createRoutes });

    expect(createRoutes).toHaveBeenCalledWith(req.store);
    expect(res.redirect).toHaveBeenCalledWith(302, '/redirect');
    expect(req.appHtml).toBe(undefined);
  });

  it('redirects when an absolute redirect route is matched', async () => {
    expect.assertions(3);

    matchPromise.mockImplementationOnce(() => ({
      redirectLocation: {
        state: url.parse('https://example.com/redirect'),
      },
    }));

    await requireCreateRequestHtmlFragment(req, res, { createRoutes });

    expect(createRoutes).toHaveBeenCalledWith(req.store);
    expect(res.redirect).toHaveBeenCalledWith(302, 'https://example.com/redirect');
    expect(req.appHtml).toBe(undefined);
  });

  it('should catch any errors and call the next middleware', async () => {
    expect.assertions(2);

    const createRoutesError = new Error('failed to create routes');
    const brokenCreateRoutes = () => { throw createRoutesError; };

    await requireCreateRequestHtmlFragment(req, res, { createRoutes: brokenCreateRoutes });

    expect(req.log.error).toHaveBeenCalled();
    expect(req.log.error.mock.calls[0]).toEqual(['error creating request HTML fragment for %s', 'http://example.com/request', createRoutesError]);
  });

  it('should use a circuit breaker', async () => {
    expect.assertions(5);

    await requireCreateRequestHtmlFragment(req, res, { createRoutes });

    expect(getBreaker().fire).toHaveBeenCalled();
    expect(composeModules).toHaveBeenCalled();
    expect(renderForStringSpy).toHaveBeenCalled();
    expect(renderForStaticMarkupSpy).not.toHaveBeenCalled();
    expect(req.appHtml).toBe('hi');
  });

  it('should fall back when the circuit opens', async () => {
    expect.assertions(4);
    const breaker = getBreaker();
    breaker.fire.mockReturnValueOnce({ fallback: true });

    await requireCreateRequestHtmlFragment(req, res, { createRoutes });

    expect(getBreaker().fire).toHaveBeenCalled();
    expect(renderForStringSpy).not.toHaveBeenCalled();
    expect(renderForStaticMarkupSpy).not.toHaveBeenCalled();
    expect(req.appHtml).toBe('');
  });

  it('should redirect instead of rendering when the circuit breaker returns a redirect', async () => {
    expect.assertions(4);
    composeModules.mockImplementationOnce(() => {
      const error = new Error('An error that redirects');
      error.abortComposeModules = true;
      error.redirect = { status: 302, url: 'https://example.com' };
      throw error;
    });
    await requireCreateRequestHtmlFragment(req, res, { createRoutes });
    expect(res.redirect).toHaveBeenCalledWith(302, 'https://example.com');
    expect(getBreaker().fire).toHaveBeenCalled();
    expect(renderForStringSpy).not.toHaveBeenCalled();
    expect(renderForStaticMarkupSpy).not.toHaveBeenCalled();
  });

  it('should default to a 302 redirect', async () => {
    expect.assertions(1);
    composeModules.mockImplementationOnce(() => {
      const error = new Error('An error that redirects');
      error.abortComposeModules = true;
      error.redirect = { url: 'https://example.com' };
      throw error;
    });
    await requireCreateRequestHtmlFragment(req, res, { createRoutes });
    expect(res.redirect).toHaveBeenCalledWith(302, 'https://example.com');
  });

  it('should rethrow if the error does not contain a redirect', async () => {
    expect.assertions(4);
    composeModules.mockImplementationOnce(() => { throw new Error('An error that does not redirect'); });
    await requireCreateRequestHtmlFragment(req, res, { createRoutes });
    expect(res.redirect).not.toHaveBeenCalled();
    expect(getBreaker().fire).toHaveBeenCalled();
    expect(renderForStringSpy).not.toHaveBeenCalled();
    expect(renderForStaticMarkupSpy).not.toHaveBeenCalled();
  });

  it('should not use the circuit breaker for partials', async () => {
    expect.assertions(5);

    getState.mockImplementationOnce(() => fromJS({
      rendering: {
        renderPartialOnly: true,
      },
    }));

    await requireCreateRequestHtmlFragment(req, res, { createRoutes });

    expect(getBreaker().fire).not.toHaveBeenCalled();
    expect(composeModules).toHaveBeenCalled();
    expect(renderForStringSpy).not.toHaveBeenCalled();
    expect(renderForStaticMarkupSpy).toHaveBeenCalled();
    expect(req.appHtml).toBe('hi');
  });

  it('should not use the circuit breaker when scripts are disabled', async () => {
    expect.assertions(5);

    getState.mockImplementationOnce(() => fromJS({
      rendering: {
        disableScripts: true,
      },
    }));

    await requireCreateRequestHtmlFragment(req, res, { createRoutes });

    expect(getBreaker().fire).not.toHaveBeenCalled();
    expect(composeModules).toHaveBeenCalled();
    expect(renderForStringSpy).not.toHaveBeenCalled();
    expect(renderForStaticMarkupSpy).toHaveBeenCalled();
    expect(req.appHtml).toBe('hi');
  });

  it('should not use the circuit breaker when rendering text only', async () => {
    expect.assertions(5);

    getState.mockImplementationOnce(() => fromJS({
      rendering: {
        renderTextOnly: true,
        renderTextOnlyOptions: { htmlTagReplacement: '', allowedHtmlTags: [] },
      },
    }));

    await requireCreateRequestHtmlFragment(req, res, { createRoutes });

    expect(getBreaker().fire).not.toHaveBeenCalled();
    expect(composeModules).toHaveBeenCalled();
    expect(renderForStringSpy).not.toHaveBeenCalled();
    expect(renderForStaticMarkupSpy).toHaveBeenCalled();
    expect(req.appHtml).toBe('hi');
  });
});
