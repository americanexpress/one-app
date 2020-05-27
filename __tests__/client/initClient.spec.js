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

import { shallow } from 'enzyme';
import { fromJS } from 'immutable';

// the extra assertion counts in the specifications are due to the `expect` found here
jest.mock('react', () => {
  const StrictMode = ({ children }) => children;
  const react = jest.requireActual('react');
  expect(react.StrictMode).toBeDefined();
  return { ...react, StrictMode };
});

jest.mock('@americanexpress/one-app-router', () => {
  const reactRouter = jest.requireActual('@americanexpress/one-app-router');
  jest.spyOn(reactRouter, 'matchPromise');
  return reactRouter;
});

jest.mock('../../src/client/prerender', () => {
  const prerender = jest.requireActual('../../src/client/prerender');
  prerender.loadPrerenderScripts = jest.fn(() => Promise.resolve());
  prerender.moveHelmetScripts = jest.fn();
  prerender.loadServiceWorker = jest.fn();
  return prerender;
});

jest.mock('react-dom', () => {
  const reactDom = jest.requireActual('react-dom');
  reactDom.hydrate = jest.fn();
  return reactDom;
});

beforeAll(() => {
  delete window.location;
  window.location = { ...new URL('https://example.com'), replace: jest.fn() };
});

describe('initClient', () => {
  const clientHolocronModuleMap = {
    modules: {
      'module-a': {
        baseUrl: 'https://example.com/cdn/module-a/1.0.0/',
        node: {
          url: 'https://example.com/cdn/module-a/1.0.0/module-a.node.js',
          integrity: '1234',
        },
        browser: {
          url: 'https://example.com/cdn/module-a/1.0.0/module-a.browser.js',
          integrity: '2345',
        },
        legacyBrowser: {
          url: 'https://example.com/cdn/module-a/1.0.0/module-a.legacy.browser.js',
          integrity: '4636',
        },
      },
    },
  };

  beforeEach(() => {
    global.fetch = jest.fn(() => Promise.resolve());
    // eslint-disable-next-line no-underscore-dangle
    global.__CLIENT_HOLOCRON_MODULE_MAP__ = clientHolocronModuleMap;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should log error to console if any errors are caught', async () => {
    expect.assertions(1);
    const { loadPrerenderScripts } = require('../../src/client/prerender');
    const mockError = new Error('This is a test error!!!');
    loadPrerenderScripts.mockReturnValue(Promise.reject(mockError));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const initClient = require('../../src/client/initClient').default;

    try {
      await initClient();
    } catch (error) {
      expect(consoleErrorSpy).toHaveBeenCalledWith(mockError);
    }
  });

  it('should redirect if there is a redirectLocation', async () => {
    expect.assertions(3);
    const promiseResolveSpy = jest.spyOn(Promise, 'resolve');

    const { matchPromise } = require('@americanexpress/one-app-router');
    matchPromise.mockImplementationOnce(
      () => Promise.resolve({
        redirectLocation: { pathname: 'path/to/redirected/location' },
        renderProps: null,
      })
    );

    const { loadPrerenderScripts } = require('../../src/client/prerender');
    loadPrerenderScripts.mockReturnValueOnce(Promise.resolve());

    const initClient = require('../../src/client/initClient').default;
    promiseResolveSpy.mockClear();

    await initClient();
    expect(window.location.replace).toHaveBeenCalledWith('path/to/redirected/location');
    expect(promiseResolveSpy).toHaveBeenCalled();
  });

  it('should return rejected promise if there is an error', async () => {
    expect.assertions(1);
    const promiseRejectionSpy = jest.spyOn(Promise, 'reject');

    const { matchPromise } = require('@americanexpress/one-app-router');
    matchPromise.mockImplementationOnce(
      (config, cb) => cb('error', { pathname: 'path/to/redirected/location' }, { testProp: 'test' })
    );

    matchPromise.mockImplementationOnce(
      () => Promise.reject(new Error('error'))
    );

    const { loadPrerenderScripts } = require('../../src/client/prerender');
    loadPrerenderScripts.mockReturnValueOnce(Promise.resolve());

    const initClient = require('../../src/client/initClient').default;

    try {
      await initClient();
    } catch (error) {
      expect(promiseRejectionSpy).toHaveBeenCalled();
    }
  });

  it('should set up the global redux store and kick off rendering', async () => {
    expect.assertions(3);
    const promiseResolveSpy = jest.spyOn(Promise, 'resolve');
    const { hydrate } = require('react-dom');

    document.getElementById = jest.fn(() => ({ remove: jest.fn() }));

    const { matchPromise } = require('@americanexpress/one-app-router');
    matchPromise.mockImplementationOnce(() => Promise.resolve({
      redirectLocation: null,
      renderProps: { testProp: 'test' },
    }));
    const { loadPrerenderScripts } = require('../../src/client/prerender');
    loadPrerenderScripts.mockReturnValueOnce(Promise.resolve());
    promiseResolveSpy.mockClear();

    const initClient = require('../../src/client/initClient').default;
    await initClient();
    expect(hydrate).toHaveBeenCalled();
    expect(promiseResolveSpy).toHaveBeenCalled();
  });

  it('should use strict mode', async () => {
    expect.assertions(2);
    const promiseResolveSpy = jest.spyOn(Promise, 'resolve');
    const { hydrate } = require('react-dom');

    document.getElementById = jest.fn(() => ({ remove: jest.fn() }));

    const { matchPromise } = require('@americanexpress/one-app-router');
    matchPromise.mockImplementationOnce(() => Promise.resolve({
      redirectLocation: null,
      renderProps: { testProp: 'test' },
    }));

    const { loadPrerenderScripts } = require('../../src/client/prerender');
    loadPrerenderScripts.mockReturnValueOnce(Promise.resolve());
    promiseResolveSpy.mockRestore();

    const initClient = require('../../src/client/initClient').default;

    await initClient();

    const tree = shallow(hydrate.mock.calls[0][0]);
    expect(tree).toMatchSnapshot();
  });

  it('should load pwa script', async () => {
    expect.assertions(2);
    document.getElementById = jest.fn(() => ({ remove: jest.fn() }));

    const { matchPromise } = require('@americanexpress/one-app-router');
    matchPromise.mockImplementationOnce(() => Promise.resolve({
      redirectLocation: null,
      renderProps: { testProp: 'test' },
    }));

    const { loadServiceWorker } = require('../../src/client/prerender');

    const initClient = require('../../src/client/initClient').default;

    await initClient();

    expect(loadServiceWorker).toHaveBeenCalledTimes(1);
  });

  it('should remove the server rendered stylesheets', async () => {
    expect.assertions(2);
    const remove = jest.fn();
    const createStyle = () => {
      const style = document.createElement('style');
      style.className = 'ssr-css';
      style.remove = remove;
      return style;
    };
    [...new Array(5)].forEach(() => document.body.appendChild(createStyle()));

    const { matchPromise } = require('@americanexpress/one-app-router');
    matchPromise.mockImplementationOnce(() => Promise.resolve({
      redirectLocation: null,
      renderProps: { testProp: 'test' },
    }));

    const { loadPrerenderScripts } = require('../../src/client/prerender');
    loadPrerenderScripts.mockReturnValueOnce(Promise.resolve());

    const initClient = require('../../src/client/initClient').default;
    await initClient();

    expect(remove).toHaveBeenCalledTimes(5);
  });

  it('should move the scripts loaded by react-helmet', async () => {
    expect.assertions(2);
    const { moveHelmetScripts } = require('../../src/client/prerender');
    const initClient = require('../../src/client/initClient').default;
    await initClient();

    expect(moveHelmetScripts).toHaveBeenCalledTimes(1);
  });

  it('should set the holocron module map with the value sent from the server', async () => {
    expect.assertions(3);
    const initClient = require('../../src/client/initClient').default;
    await initClient();
    const { getModuleMap } = require('holocron');

    expect(getModuleMap().equals(fromJS(clientHolocronModuleMap))).toBe(true);
    expect(getModuleMap()).toMatchSnapshot();
  });
});
