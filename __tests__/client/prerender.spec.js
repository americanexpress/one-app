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

import { fromJS } from 'immutable';
import { addErrorToReport } from '@americanexpress/one-app-ducks';

import {
  initializeClientStore, loadPrerenderScripts, moveHelmetScripts, loadServiceWorker,
} from '../../src/client/prerender';
import { initializeServiceWorker } from '../../src/client/service-worker';

jest.mock('@americanexpress/one-app-router', () => ({
  browserHistory: 'browserHistory',
}));
jest.mock('../../src/universal/enhancers', () => jest.fn(() => 'enhancer'));
jest.mock('../../src/universal/utils/transit', () => ({
  fromJSON: jest.fn(() => 'initial state'),
}));
jest.mock('holocron', () => ({
  createHolocronStore: jest.fn(),
}));
jest.mock('../../src/universal/reducers', () => 'reducers');

jest.mock('@americanexpress/one-app-ducks', () => ({
  getLocalePack: jest.fn((locale) => Promise.resolve(locale)),
  addErrorToReport: jest.fn(),
}));

jest.mock('../../src/universal/utils/createTimeoutFetch', () => jest.fn(
  (timeout) => (next) => () => next()
    .then((res) => {
      res.timeout = timeout;
      return res;
    })
));
jest.mock('../../src/client/service-worker', () => ({ initializeServiceWorker: jest.fn(() => Promise.resolve()) }));

describe('initializeClientStore', () => {
  beforeAll(() => {
    global.fetch = () => Promise.resolve({ data: 'data' });
  });

  afterAll(() => {
    global.fetch = undefined;
  });


  afterEach(() => {
    // eslint-disable-next-line no-underscore-dangle
    global.__INITIAL_STATE__ = undefined;
  });

  it('should create the store with initial state if it exists', async () => {
    // eslint-disable-next-line no-underscore-dangle
    global.__INITIAL_STATE__ = fromJS({ some: 'state' });
    initializeClientStore();

    const createEnhancer = require('../../src/universal/enhancers');
    const transitFromJson = require('../../src/universal/utils/transit').fromJSON;
    const { createHolocronStore } = require('holocron');
    const {
      extraThunkArguments: { fetchClient },
    } = createHolocronStore.mock.calls[0][0];

    await expect(fetchClient()).resolves.toEqual({ data: 'data', timeout: 6000 });
    // eslint-disable-next-line no-underscore-dangle
    expect(transitFromJson).toHaveBeenCalledWith(global.__INITIAL_STATE__);
    expect(createHolocronStore).toHaveBeenCalledWith({
      enhancer: 'enhancer', initialState: 'initial state', reducer: 'reducers', extraThunkArguments: { fetchClient },
    });
    expect(createEnhancer).toHaveBeenCalled();
  });

  it('should create the store with no initial state if it is undefined', async () => {
    const createEnhancer = require('../../src/universal/enhancers');
    const transitFromJson = require('../../src/universal/utils/transit').fromJSON;
    // need to call mockClear because jest.clearAllMocks() was removed
    // TODO: switch to clearAllMocks when it is added back to jest https://github.com/facebook/jest/issues/2134
    transitFromJson.mockClear();
    const { createHolocronStore } = require('holocron');
    initializeClientStore();
    const {
      extraThunkArguments: { fetchClient },
    } = createHolocronStore.mock.calls[0][0];
    await expect(fetchClient()).resolves.toEqual({ data: 'data', timeout: 6000 });
    expect(transitFromJson).not.toHaveBeenCalled();
    expect(createHolocronStore).toHaveBeenCalledWith({
      enhancer: 'enhancer', initialState: 'initial state', reducer: 'reducers', extraThunkArguments: { fetchClient },
    });
    expect(createEnhancer).toHaveBeenCalled();
  });
});

describe('loadPrerenderScripts', () => {
  it('should load the correct locale pack', () => {
    const initialState = fromJS({ intl: { activeLocale: 'es-ES' } });

    return loadPrerenderScripts(initialState)
      .then((localePack) => {
        expect(localePack).toBe('es-ES');
        const { getLocalePack } = require('@americanexpress/one-app-ducks');
        expect(getLocalePack).toHaveBeenCalledWith('es-ES');
      });
  });

  it('should still resolve if there is no active locale', () => loadPrerenderScripts()
    .then((localePack) => {
      expect(localePack).toBeUndefined();
      const { getLocalePack } = require('@americanexpress/one-app-ducks');
      // need to call clearMock because jest.clearAllMocks() was removed
      // TODO: switch to clearAllMocks when it is added back to jest https://github.com/facebook/jest/issues/2134
      getLocalePack.mockClear();
      expect(getLocalePack).not.toHaveBeenCalled();
    })
  );
});

describe('moveHelmetScripts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    [...document.querySelectorAll('script')].forEach((scriptTag) => { scriptTag.parentElement.removeChild(scriptTag); });

    jest.spyOn(document, 'addEventListener').mockImplementation(() => { /* noop */ });
  });

  const createScript = ({ src, helmet }) => {
    const script = document.createElement('script');
    script.src = src;
    if (helmet) script.setAttribute('data-react-helmet', true);
    return script;
  };

  it('should register a listener on the document for DOMContentLoaded', () => {
    moveHelmetScripts();
    expect(document.addEventListener).toHaveBeenCalledTimes(1);
    expect(document.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
  });

  it('should only move scripts that were injected by react-helmet, ignoring others', () => {
    [
      { src: 'hello.js', helmet: true },
      { src: 'world.js', helmet: true },
      { src: 'foo.js', helmet: false },
      { src: 'bar.js', helmet: false },
      { src: 'baz.js', helmet: true },
    ]
      .map(createScript)
      .forEach((script) => document.body.appendChild(script));

    moveHelmetScripts();
    document.addEventListener.mock.calls[0][1]();

    expect(document.querySelectorAll('body script')).toMatchSnapshot('non-helmet scripts');
    expect(document.querySelectorAll('head script')).toMatchSnapshot('helmet scripts');
  });

  it('should not expect NodeList to have forEach due to IE', () => {
    [
      { src: 'hello.js', helmet: true },
      { src: 'world.js', helmet: true },
    ]
      .map(createScript)
      .forEach((script) => document.body.appendChild(script));

    moveHelmetScripts();
    jest.spyOn(NodeList.prototype, 'forEach');
    document.addEventListener.mock.calls[0][1]();
    expect(NodeList.prototype.forEach).not.toHaveBeenCalled();
  });
});

describe('loadServiceWorker', () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call initializeServiceWorker and resolve', async () => {
    expect.assertions(2);

    await expect(loadServiceWorker({ dispatch, config: {} })).resolves.toBeUndefined();
    expect(initializeServiceWorker).toHaveBeenCalledTimes(1);
  });

  it('should not crash the application on failure nor should loadServiceWorker reject', async () => {
    expect.assertions(4);

    const error = new Error('ooops');
    initializeServiceWorker.mockImplementationOnce(() => Promise.reject(error));

    await expect(loadServiceWorker({ dispatch, config: {} })).resolves.toBeUndefined();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(initializeServiceWorker).toHaveBeenCalledTimes(1);
    expect(addErrorToReport).toHaveBeenCalledWith(error);
  });
});
