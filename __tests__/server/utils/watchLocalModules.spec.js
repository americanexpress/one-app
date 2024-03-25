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

import path from 'path';
import { fromJS } from 'immutable';
import chokidar from 'chokidar';
import loadModule from 'holocron/loadModule.node';
import { getModules, resetModuleRegistry } from 'holocron/moduleRegistry';
import watchLocalModules from '../../../src/server/utils/watchLocalModules';

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

jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});

describe('watchLocalModules', () => {
  let origOneAppDevCDNPort;
  beforeAll(() => {
    origOneAppDevCDNPort = process.env.HTTP_ONE_APP_DEV_CDN_PORT;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.HTTP_ONE_APP_DEV_CDN_PORT;
  });
  afterAll(() => {
    process.env.HTTP_ONE_APP_DEV_CDN_PORT = origOneAppDevCDNPort;
  });

  it('should watch the modules directory', () => {
    watchLocalModules();
    expect(chokidar.watch).toHaveBeenCalledTimes(1);
    expect(chokidar.watch.mock.calls[0][0]).toMatchInlineSnapshot('"*/*/*.node.js"');
    // absolute path varies based on where the repository has been checked out
    expect(chokidar.watch.mock.calls[0][1]).toHaveProperty('cwd');
    const { cwd } = chokidar.watch.mock.calls[0][1];
    delete chokidar.watch.mock.calls[0][1].cwd;
    expect(path.relative(path.resolve(__dirname, '../../../'), cwd)).toMatchInlineSnapshot(
      '"static/modules"'
    );
    // can now look at the rest
    expect(chokidar.watch.mock.calls[0][1]).toMatchInlineSnapshot(`
      Object {
        "awaitWriteFinish": true,
      }
    `);
  });

  it('should tell the user when a module build was updated', async () => {
    const moduleName = 'some-module';
    const moduleVersion = '1.0.1';
    const moduleMapSample = {
      modules: {
        [moduleName]: {
          baseUrl: `http://localhost:3001/static/modules/${moduleName}/${moduleVersion}/`,
          node: {
            integrity: '133',
            url: `http://localhost:3001/static/modules/${moduleName}/${moduleVersion}/${moduleName}.node.js`,
          },
          browser: {
            integrity: '234',
            url: `http://localhost:3001/static/modules/${moduleName}/${moduleVersion}/${moduleName}.browser.js`,
          },
          legacyBrowser: {
            integrity: '134633',
            url: `http://localhost:3001/static/modules/${moduleName}/${moduleVersion}/${moduleName}.legacy.browser.js`,
          },
        },
      },
    };
    const modulePath = `${moduleName}/${moduleVersion}/${moduleName}.node.js`;
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
    expect(console.log).toHaveBeenCalled();
    expect(console.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "the Node.js bundle for some-module finished saving, attempting to load",
      ]
    `);
  });

  it('should tell the user when the updated module is loaded', async () => {
    const moduleName = 'some-module';
    const moduleVersion = '1.0.1';
    const moduleMapSample = {
      modules: {
        [moduleName]: {
          baseUrl: `http://localhost:3001/static/modules/${moduleName}/${moduleVersion}/`,
          node: {
            integrity: '133',
            url: `http://localhost:3001/static/modules/${moduleName}/${moduleVersion}/${moduleName}.node.js`,
          },
          browser: {
            integrity: '234',
            url: `http://localhost:3001/static/modules/${moduleName}/${moduleVersion}/${moduleName}.browser.js`,
          },
          legacyBrowser: {
            integrity: '134633',
            url: `http://localhost:3001/static/modules/${moduleName}/${moduleVersion}/${moduleName}.legacy.browser.js`,
          },
        },
      },
    };
    const modulePath = `${moduleName}/${moduleVersion}/${moduleName}.node.js`;
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
    expect(loadModule).toHaveBeenCalledTimes(1);
    expect(getModules().get(moduleName)).toBe(updatedModule);
    expect(console.log).toHaveBeenCalledTimes(2);
    expect(console.log.mock.calls[1]).toMatchInlineSnapshot(`
      Array [
        "finished reloading some-module",
      ]
    `);
  });

  it('should update the module registry when a server bundle changes', async () => {
    const moduleName = 'some-module';
    const moduleVersion = '1.0.1';
    const moduleMapSample = {
      modules: {
        [moduleName]: {
          baseUrl: `http://localhost:3001/static/modules/${moduleName}/${moduleVersion}/`,
          node: {
            integrity: '133',
            url: `http://localhost:3001/static/modules/${moduleName}/${moduleVersion}/${moduleName}.node.js`,
          },
          browser: {
            integrity: '234',
            url: `http://localhost:3001/static/modules/${moduleName}/${moduleVersion}/${moduleName}.browser.js`,
          },
          legacyBrowser: {
            integrity: '134633',
            url: `http://localhost:3001/static/modules/${moduleName}/${moduleVersion}/${moduleName}.legacy.browser.js`,
          },
        },
      },
    };
    const modulePath = `${moduleName}/${moduleVersion}/${moduleName}.node.js`;
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
    expect(loadModule).toHaveBeenCalledTimes(1);
    expect(loadModule.mock.calls[0][0]).toBe(moduleName);
    expect(loadModule.mock.calls[0][1]).toMatchInlineSnapshot(`
      Object {
        "baseUrl": "http://localhost:3001/static/modules/some-module/1.0.1/",
        "browser": Object {
          "integrity": "234",
          "url": "http://localhost:3001/static/modules/some-module/1.0.1/some-module.browser.js",
        },
        "legacyBrowser": Object {
          "integrity": "134633",
          "url": "http://localhost:3001/static/modules/some-module/1.0.1/some-module.legacy.browser.js",
        },
        "node": Object {
          "integrity": "133",
          "url": "http://localhost:3001/static/modules/some-module/1.0.1/some-module.node.js",
        },
      }
    `);
    expect(loadModule.mock.calls[0][2]).toBe(
      require('../../../src/server/utils/onModuleLoad').default
    );
    expect(getModules().get(moduleName)).toBe(updatedModule);
  });

  it('should not change the module registry when a new module fails to load', async () => {
    const moduleName = 'some-module';
    const moduleVersion = '1.0.1';
    const moduleMapSample = {
      modules: {
        [moduleName]: {
          baseUrl: `http://localhost:3001/static/modules/${moduleName}/${moduleVersion}/`,
          node: {
            integrity: '133',
            url: `http://localhost:3001/static/modules/${moduleName}/${moduleVersion}/${moduleName}.node.js`,
          },
          browser: {
            integrity: '234',
            url: `http://localhost:3001/static/modules/${moduleName}/${moduleVersion}/${moduleName}.browser.js`,
          },
          legacyBrowser: {
            integrity: '134633',
            url: `http://localhost:3001/static/modules/${moduleName}/${moduleVersion}/${moduleName}.legacy.browser.js`,
          },
        },
      },
    };
    const modulePath = `${moduleName}/${moduleVersion}/${moduleName}.node.js`;
    const originalModule = () => null;
    const modules = fromJS({ [moduleName]: originalModule });
    const moduleMap = fromJS(moduleMapSample);
    resetModuleRegistry(modules, moduleMap);
    watchLocalModules();
    const changeListener = chokidar.getListeners().change;
    expect(getModules().get(moduleName)).toBe(originalModule);
    loadModule.mockImplementationOnce(() => Promise.reject(new Error('sample-module startup error')));

    // usually we'd expect the thrown error to propogate up but loadModule take it upon itself to
    // log the error for the user, so watchLocalModules avoids logging the error another time, and
    // avoids throwing the error as that would log the error a _third_ time
    // so instead of rejecting here `await expect(changeListener(modulePath)).rejects.toThrow(...)`
    // we look to the resolution
    await expect(changeListener(modulePath)).resolves.toBe(undefined);

    expect(loadModule).toHaveBeenCalledTimes(1);
    expect(getModules().get(moduleName)).toBe(originalModule);
  });

  it('should warn the user about what looks like a changed module that cannot be used', async () => {
    const changedPath = 'dont-match-me.node.js';
    watchLocalModules();
    const changeListener = chokidar.getListeners().change;
    await changeListener(changedPath);
    expect(loadModule).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "detected a change in module static resources at \\"dont-match-me.node.js\\" but unable to reload it in the running server",
      ]
    `);
  });

  it('should ignore changes to all bundles but the server bundle', async () => {
    const moduleName = 'some-module';
    const moduleVersion = '1.0.0';
    watchLocalModules();
    const changeListener = chokidar.getListeners().change;
    await changeListener(`${moduleName}/${moduleVersion}/${moduleName}.browser.js`);
    expect(loadModule).not.toHaveBeenCalled();
    await changeListener(`${moduleName}/${moduleVersion}/${moduleName}.legacy.browser.js`);
    expect(loadModule).not.toHaveBeenCalled();
  });

  it('should ignore changes to server bundles that are not the module entrypoint', async () => {
    const moduleName = 'some-module';
    const moduleVersion = '1.0.0';
    const changedPath = `${moduleName}/${moduleVersion}/vendors.node.js`;
    watchLocalModules();
    const changeListener = chokidar.getListeners().change;
    await changeListener(changedPath);
    expect(loadModule).not.toHaveBeenCalled();
  });

  it('should ignore changes to files that are not JavaScript', async () => {
    const moduleName = 'some-module';
    const moduleVersion = '1.0.0';
    const changedPath = `${moduleName}/${moduleVersion}/assets/image.png`;
    watchLocalModules();
    const changeListener = chokidar.getListeners().change;
    await changeListener(changedPath);
    expect(loadModule).not.toHaveBeenCalled();
  });
});
