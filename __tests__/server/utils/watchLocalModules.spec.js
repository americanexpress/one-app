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

import fs from 'fs';
import path from 'path';
import { fromJS } from 'immutable';
import chokidar from 'chokidar';
import loadModule from 'holocron/loadModule.node';
import {
  getModules,
  resetModuleRegistry,
} from 'holocron/moduleRegistry';
import { address } from 'ip';
import watchLocalModules from '../../../src/server/utils/watchLocalModules';

const ip = address();

jest.mock('chokidar', () => {
  const listeners = {};
  const watcher = () => null;
  watcher.on = (event, listener) => {
    listeners[event] = listener;
  };
  const watch = jest.fn(() => watcher);
  const getListeners = () => listeners;
  return { watch, getListeners };
});

jest.mock('holocron/moduleRegistry', () => {
  const immutable = require('immutable');
  let modules = immutable.fromJS();
  let moduleMap = immutable.fromJS();
  const mockGetModules = () => modules;
  const mockAddHigherOrderComponent = (module) => module;
  const mockResetModuleRegistry = (modulesToSet, moduleMapToSet) => {
    modules = modulesToSet;
    moduleMap = moduleMapToSet;
  };
  const mockGetModuleMap = () => moduleMap;
  return {
    addHigherOrderComponent: mockAddHigherOrderComponent,
    getModules: mockGetModules,
    resetModuleRegistry: mockResetModuleRegistry,
    getModuleMap: mockGetModuleMap,
  };
});

jest.mock('holocron/loadModule.node', () => jest.fn(() => Promise.resolve(() => null)));
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    readFileSync: jest.fn(actual.readFileSync),
  };
});

describe('watchLocalModules', () => {
  beforeEach(() => jest.clearAllMocks());
  let origOneAppDevCDNPort;
  beforeAll(() => {
    origOneAppDevCDNPort = process.env.HTTP_ONE_APP_DEV_CDN_PORT;
  });
  afterAll(() => {
    process.env.HTTP_ONE_APP_DEV_CDN_PORT = origOneAppDevCDNPort;
  });

  it('should watch the modules directory', () => {
    watchLocalModules();
    expect(chokidar.watch).toHaveBeenCalledWith(path.resolve(__dirname, '../../../static/modules'));
  });

  it('should update the module registry when a server bundle changes', async () => {
    const moduleName = 'some-module';
    const moduleVersion = '1.0.1';
    const moduleMapSample = {
      modules: {
        [moduleName]: {
          node: {
            integrity: '133',
            url: `https://example.com/cdn/${moduleName}/${moduleVersion}/${moduleName}-node.js`,
          },
          browser: {
            integrity: '234',
            url: `https://example.com/cdn/${moduleName}/${moduleVersion}/${moduleName}-browser.js`,
          },
          legacyBrowser: {
            integrity: '134633',
            url: `https://example.com/cdn/${moduleName}/${moduleVersion}/${moduleName}-legacy.browser.js`,
          },
        },
      },
    };
    fs.readFileSync.mockImplementationOnce(() => JSON.stringify(moduleMapSample));
    const modulePath = path.resolve(__dirname, `../../../static/modules/${moduleName}/${moduleVersion}/${moduleName}.node.js`);
    const originalModule = () => null;
    const updatedModule = () => null;
    const modules = fromJS({ [moduleName]: originalModule });
    const moduleMap = fromJS(moduleMapSample);
    resetModuleRegistry(modules, moduleMap);
    watchLocalModules();
    const changeListener = chokidar.getListeners().change;
    expect(getModules().get(moduleName)).toBe(originalModule);
    loadModule.mockReturnValueOnce(Promise.resolve(updatedModule));
    await changeListener(modulePath);
    expect(loadModule).toHaveBeenCalledWith(
      moduleName,
      moduleMapSample.modules[moduleName],
      require('../../../src/server/utils/onModuleLoad').default
    );
    expect(getModules().get(moduleName)).toBe(updatedModule);
  });

  it('should ignore when the regex doesn\'t match', async () => {
    const changedPath = path.resolve(__dirname, '../../../static/modules/dont-match-me-bro.node.js');
    watchLocalModules();
    const changeListener = chokidar.getListeners().change;
    await changeListener(changedPath);
    expect(loadModule).not.toHaveBeenCalled();
  });

  it('should ignore changes to all files but the server bundle', async () => {
    const moduleName = 'some-module';
    const moduleVersion = '1.0.0';
    const changedPath = path.resolve(__dirname, `../../../static/modules/${moduleName}/${moduleVersion}/assets/image.png`);
    watchLocalModules();
    const changeListener = chokidar.getListeners().change;
    await changeListener(changedPath);
    expect(loadModule).not.toHaveBeenCalled();
  });

  it('should replace [one-app-dev-cdn-url] with correct ip and port', async () => {
    const moduleName = 'some-module';
    const moduleVersion = '1.0.1';
    process.env.HTTP_ONE_APP_DEV_CDN_PORT = 3002;
    const moduleMapSample = {
      modules: {
        [moduleName]: {
          node: {
            integrity: '133',
            url: `[one-app-dev-cdn-url]/cdn/${moduleName}/${moduleVersion}/${moduleName}-node.js`,
          },
          browser: {
            integrity: '234',
            url: `[one-app-dev-cdn-url]/cdn/${moduleName}/${moduleVersion}/${moduleName}-browser.js`,
          },
          legacyBrowser: {
            integrity: '134633',
            url: `[one-app-dev-cdn-url]/cdn/${moduleName}/${moduleVersion}/${moduleName}-legacy.browser.js`,
          },
        },
      },
    };
    const oneAppDevCdnAddress = `http://${ip}:${process.env.HTTP_ONE_APP_DEV_CDN_PORT || 3001}`;
    const updatedModuleMapSample = {
      modules: {
        [moduleName]: {
          node: {
            integrity: '133',
            url: `${oneAppDevCdnAddress}/cdn/${moduleName}/${moduleVersion}/${moduleName}-node.js`,
          },
          browser: {
            integrity: '234',
            url: `${oneAppDevCdnAddress}/cdn/${moduleName}/${moduleVersion}/${moduleName}-browser.js`,
          },
          legacyBrowser: {
            integrity: '134633',
            url: `${oneAppDevCdnAddress}/cdn/${moduleName}/${moduleVersion}/${moduleName}-legacy.browser.js`,
          },
        },
      },
    };
    fs.readFileSync.mockImplementationOnce(() => JSON.stringify(moduleMapSample));
    const modulePath = path.resolve(__dirname, `../../../static/modules/${moduleName}/${moduleVersion}/${moduleName}.node.js`);
    const originalModule = () => null;
    const updatedModule = () => null;
    const modules = fromJS({ [moduleName]: originalModule });
    const moduleMap = fromJS(moduleMapSample);
    resetModuleRegistry(modules, moduleMap);
    watchLocalModules();
    const changeListener = chokidar.getListeners().change;
    expect(getModules().get(moduleName)).toBe(originalModule);
    loadModule.mockReturnValueOnce(Promise.resolve(updatedModule));
    await changeListener(modulePath);
    expect(loadModule).toHaveBeenCalledWith(
      moduleName,
      updatedModuleMapSample.modules[moduleName],
      require('../../../src/server/utils/onModuleLoad').default
    );
    expect(getModules().get(moduleName)).toBe(updatedModule);
  });
});
