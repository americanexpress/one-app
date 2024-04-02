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
import { getModules, resetModuleRegistry } from 'holocron/moduleRegistry';
import watchLocalModules from '../../../src/server/utils/watchLocalModules';

const setTimeoutNative = global.setTimeout;
const sleep = (ms) => new Promise((resolve) => setTimeoutNative(resolve, ms));
jest.useFakeTimers();

jest.mock('fs', () => {
  const fs = jest.requireActual('fs');

  let mockedFilesystem;
  /* Map {
    indicator: 'd',
    stat: {...},
    entries: Map {
      'home': Map {
        indicator: 'd',
        stat: {...},
        entries: Map {
          'username': Map {
            indicator: 'd',
            stat: {...},
            entries: Map {
              'hello.txt': Map {
                indicator: 'f',
                stat: {...},
              }
            }
          }
        }
      }
    }
  } */

  function getEntry(parts) {
    let current = mockedFilesystem;
    for (let i = 0; i < parts.length; i++) {
      if (!current || !current.has('entries')) {
        return null;
      }
      const entryName = parts[i];
      current = current.get('entries').get(entryName);
    }

    return current;
  }

  let inodeCount = 0;
  const mock = {
    clear() {
      const createdMillis = Date.now() + Math.floor(Math.random() * 1e4) / 1e4;
      mockedFilesystem = new Map([
        ['indicator', 'd'],
        [
          'stat',
          {
            dev: 1234,
            mode: 16877,
            nlink: 1,
            uid: 512,
            gid: 512,
            rdev: 0,
            blksize: 4096,
            ino: ++inodeCount,
            size: 128,
            blocks: 0,
            atimeMs: Date.now() + Math.floor(Math.random() * 1e4) / 1e4,
            mtimeMs: createdMillis,
            ctimeMs: createdMillis,
            birthtimeMs: createdMillis,
          },
        ],
        ['entries', new Map()],
      ]);
    },
    delete(fsPath) {
      const parts = fsPath.split('/').filter(Boolean);
      const final = parts.pop();
      const parent = getEntry(parts);
      if (!parent || !parent.has('entries')) {
        throw new Error(`not in mock fs ${fsPath} (delete)`);
      }
      parent.get('entries').delete(final);
      return mock;
    },
    mkdir(fsPath, { parents: createParents } = { parents: false }) {
      let parent = mockedFilesystem;
      const parts = fsPath.split('/').filter(Boolean);

      for (let i = 0; i < parts.length; i++) {
        const nextEntry = parts[i];
        if (
          parent.get('entries').has(nextEntry) &&
          parent.get('entries').get(nextEntry).get('indicator') !== 'd'
        ) {
          throw new Error(`parent is not a directory ${fsPath} (mkdir)`);
        }
        if (!parent.get('entries').has(nextEntry)) {
          if (i !== (parts.length - 1) && !createParents) {
            throw new Error(`parent directory does not exist for ${fsPath}`);
          }
          parent.get('entries').set(
            nextEntry,
            new Map([
              ['indicator', 'd'],
              [
                'stat',
                {
                  dev: 1234,
                  mode: 16877,
                  nlink: 1,
                  uid: 512,
                  gid: 512,
                  rdev: 0,
                  blksize: 4096,
                  ino: ++inodeCount,
                  size: 128,
                  blocks: 0,
                  atimeMs: Date.now() + 0.3254,
                  mtimeMs: Date.now() + 0.2454,
                  ctimeMs: Date.now() + 0.2454,
                  birthtimeMs: Date.now() + 0.0117,
                },
              ],
              ['entries', new Map()],
            ])
          );
        }
        parent = parent.get('entries').get(nextEntry);
      }
      return mock;
    },
    writeFile(fsPath, contents) {
      const parts = fsPath.split('/').filter(Boolean);
      const final = parts.pop();
      const parent = getEntry(parts);
      if (!parent || !parent.get('entries')) {
        throw new Error(`not in mock fs ${fsPath} (write)`);
      }

      if (parent.get('entries').has(final)) {
        const fileEntry = parent.get('entries').get(final);
        Object.assign(
          fileEntry.get('stat'),
          { mtimeMs: Date.now() + Math.floor(Math.random() * 1e4) / 1e4 }
        );
        fileEntry.set('contents', contents);
      } else {
        const createdMillis = Date.now() + Math.floor(Math.random() * 1e4) / 1e4;
        parent.get('entries').set(
          final,
          new Map([
            ['indicator', 'f'],
            [
              'stat',
              {
                dev: 1234,
                mode: 33188,
                nlink: 1,
                uid: 512,
                gid: 512,
                rdev: 0,
                blksize: 4096,
                ino: ++inodeCount,
                size: contents.length,
                blocks: contents.length / 512,
                atimeMs: Date.now() + Math.floor(Math.random() * 1e4) / 1e4,
                mtimeMs: createdMillis,
                ctimeMs: createdMillis,
                birthtimeMs: createdMillis,
              },
            ],
            ['contents', contents],
          ])
        );
      }

      return mock;
    },
    print() {
      function traverser(parentPath, entry) {
        let printout = '';
        for (const [childName, childNode] of entry.get('entries').entries()) {
          const childPath = `${parentPath}/${childName}`;
          if (!childNode) {
            throw new Error(`no child for ${childName}??`);
          }
          const indicator = childNode.get('indicator');
          printout += `${indicator} ${childPath}\n`;
          if (indicator === 'd') {
            printout += traverser(childPath, childNode);
          }
        }
        return printout;
      }

      const printout = traverser('', mockedFilesystem);
      console.log(printout);
      return mock;
    },
  };

  mock.clear();

  jest.spyOn(fs, 'readdir').mockImplementation((dirPath, callback) => {
    const parts = dirPath.split('/').filter(Boolean);
    const dir = getEntry(parts);
    if (!dir) {
      setImmediate(callback, new Error(`not in mock fs ${dirPath} (readdir)`));
      return;
    }
    if (dir.get('indicator') !== 'd') {
      setImmediate(callback, new Error(`not a mocked directory ${dirPath} (readdir)`));
      return;
    }

    setImmediate(callback, null, [...dir.get('entries').keys()]);
    return;
  });

  jest.spyOn(fs.promises, 'stat').mockImplementation(
    (fsPath) =>
      new Promise((resolve, reject) => {
        const entry = getEntry(fsPath.split('/').filter(Boolean));
        if (!entry) {
          return reject(new Error(`no entry for ${fsPath} (stat)`));
        }

        const statArgs = entry.get('stat');
        const {
          dev,
          mode,
          nlink,
          uid,
          gid,
          rdev,
          blksize,
          ino,
          size,
          blocks,
          atimeMs,
          mtimeMs,
          ctimeMs,
          birthtimeMs,
        } = statArgs;
        return resolve(
          new fs.Stats(
            dev,
            mode,
            nlink,
            uid,
            gid,
            rdev,
            blksize,
            ino,
            size,
            blocks,
            atimeMs,
            mtimeMs,
            ctimeMs,
            birthtimeMs
          )
        );
      })
  );

  fs.mock = mock;

  return fs;
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
    fs.mock.clear();
  });
  afterEach(() => {
    jest.clearAllTimers();
  });
  afterAll(() => {
    process.env.HTTP_ONE_APP_DEV_CDN_PORT = origOneAppDevCDNPort;
  });

  it('should tell the user when a module build was updated', async () => {
    expect.assertions(6);
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
    const originalModule = () => null;
    const updatedModule = () => null;
    const modules = fromJS({ [moduleName]: originalModule });
    const moduleMap = fromJS(moduleMapSample);
    resetModuleRegistry(modules, moduleMap);
    fs.mock
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("hello");');

    watchLocalModules();

    expect(getModules().get(moduleName)).toBe(originalModule);
    loadModule.mockReturnValueOnce(Promise.resolve(updatedModule));
    jest.runOnlyPendingTimers();
    await sleep(100);
    expect(console.log).not.toHaveBeenCalled();

    jest.advanceTimersByTime(30e3);
    fs.mock
      .delete(path.resolve('static/modules', moduleName))
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("hello again");');

    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.advanceTimersByTime(100);
    
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "the Node.js bundle for some-module finished saving, attempting to load",
      ]
    `);

    await sleep(500);

    expect(console.log).toHaveBeenCalledTimes(2);
    expect(console.log.mock.calls[1]).toMatchInlineSnapshot(`
      Array [
        "finished reloading some-module",
      ]
    `);
  });

  it('should tell the user when the updated module is loaded', async () => {
    expect.assertions(6);
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
    fs.mock
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("hello");');

    watchLocalModules();

    expect(getModules().get(moduleName)).toBe(originalModule);
    loadModule.mockReturnValueOnce(Promise.resolve(updatedModule));
    jest.runOnlyPendingTimers();
    await sleep(100);
    expect(console.log).not.toHaveBeenCalled();

    jest.advanceTimersByTime(30e3);
    fs.mock
      .delete(path.resolve('static/modules', moduleName))
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("hello again");');

    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.advanceTimersByTime(100);

    await sleep(500);

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
    expect.assertions(7);
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
    fs.mock
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("hello");');

    watchLocalModules();
    expect(getModules().get(moduleName)).toBe(originalModule);
    loadModule.mockReturnValueOnce(Promise.resolve(updatedModule));

    jest.runOnlyPendingTimers();
    await sleep(100);
    expect(console.log).not.toHaveBeenCalled();

    jest.advanceTimersByTime(30e3);
    fs.mock
      .delete(path.resolve('static/modules', moduleName))
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("hello again");');

    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.advanceTimersByTime(100);

    await sleep(500);

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
    expect.assertions(4);
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
    fs.mock
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("hello");');

    watchLocalModules();
    expect(getModules().get(moduleName)).toBe(originalModule);
    loadModule.mockImplementationOnce(() =>
      Promise.reject(new Error('sample-module startup error'))
    );

    jest.runOnlyPendingTimers();
    await sleep(100);
    expect(console.log).not.toHaveBeenCalled();

    jest.advanceTimersByTime(30e3);
    fs.mock
      .delete(path.resolve('static/modules', moduleName))
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("hello again");');

    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.advanceTimersByTime(100);

    await sleep(500);

    expect(loadModule).toHaveBeenCalledTimes(1);
    expect(getModules().get(moduleName)).toBe(originalModule);
  });

  it('should wait if the file was written to since it was detected to have changed', async () => {
    expect.assertions(5);
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
    const originalModule = () => null;
    const updatedModule = () => null;
    const modules = fromJS({ [moduleName]: originalModule });
    const moduleMap = fromJS(moduleMapSample);
    resetModuleRegistry(modules, moduleMap);
    fs.mock
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("hello");');

    watchLocalModules();

    expect(getModules().get(moduleName)).toBe(originalModule);
    loadModule.mockReturnValueOnce(Promise.resolve(updatedModule));
    jest.runOnlyPendingTimers();
    await sleep(100);
    expect(console.log).not.toHaveBeenCalled();

    jest.advanceTimersByTime(30e3);
    fs.mock
      .delete(path.resolve('static/modules', moduleName))
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("he')
      
    jest.advanceTimersByTime(300);
    await sleep(5);
    
    expect(console.log).not.toHaveBeenCalled();
    
    fs.mock.writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("hello again");');

    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.advanceTimersByTime(100);

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "the Node.js bundle for some-module finished saving, attempting to load",
      ]
    `);
  });
  
  it.todo('should load a module that has since been built but was not on disk when the process started');
  
  it.todo('should ignore modules that are not in the module map');
  
  // instance when the CHANGE_WATCHER_INTERVAL and WRITING_FINISH_WATCHER_TIMEOUT lined up
  // we need to avoid scheduling the write watcher like a tree (many branches, eventually eating all CPU and memory)
  it.todo('should schedule watching for writes only once when both watchers have run');

  it('should ignore changes to all bundles but the server bundle', async () => {
    expect.assertions(3);
    const moduleName = 'some-module';
    const moduleVersion = '1.0.0';
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
    const originalModule = () => null;
    const updatedModule = () => null;
    const modules = fromJS({ [moduleName]: originalModule });
    const moduleMap = fromJS(moduleMapSample);
    resetModuleRegistry(modules, moduleMap);
    fs.mock
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("hello Node.js");')
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.browser.js`), 'console.log("hello Browser");')
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.legacy.browser.js`), 'console.log("hello previous spec Browser");');

    watchLocalModules();
    
    jest.runOnlyPendingTimers();
    await sleep(100);
    expect(console.log).not.toHaveBeenCalled();

    jest.advanceTimersByTime(30e3);
    fs.mock
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.browser.js`), 'console.log("hello again Browser");')
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.legacy.browser.js`), 'console.log("hello again previous spec Browser");');

    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.advanceTimersByTime(100);

    await sleep(500);

    expect(loadModule).not.toHaveBeenCalled();

    fs.mock.writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("hello Node.js");')

    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.advanceTimersByTime(100);

    await sleep(500);

    expect(loadModule).toHaveBeenCalled();
  });

  it('should ignore changes to server bundles that are not the module entrypoint', async () => {
    expect.assertions(3);
    const moduleName = 'some-module';
    const moduleVersion = '1.0.0';
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
    fs.mock
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("hello");')
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `vendors.node.js`), 'console.log("hi");');
      
    watchLocalModules();
    
    jest.runOnlyPendingTimers();
    await sleep(100);
    expect(console.log).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(30e3);
    fs.mock.writeFile(path.resolve('static/modules', moduleName, moduleVersion, `vendors.node.js`), 'console.log("hi there");');

    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.advanceTimersByTime(100);

    await sleep(500);
    expect(loadModule).not.toHaveBeenCalled();

    
    fs.mock
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("hello again");');

    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.advanceTimersByTime(100);

    await sleep(500);

    expect(loadModule).toHaveBeenCalled();
  });

  it('should ignore changes to files that are not JavaScript', async () => {
    expect.assertions(3);
    const moduleName = 'some-module';
    const moduleVersion = '1.0.0';
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
    fs.mock
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("hello");')
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion, 'assets'), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, 'assets', `image.png`), 'binary stuff');

    watchLocalModules();

    jest.runOnlyPendingTimers();
    await sleep(100);
    expect(console.log).not.toHaveBeenCalled();

    jest.advanceTimersByTime(30e3);
    fs.mock.writeFile(path.resolve('static/modules', moduleName, moduleVersion, 'assets', `image.png`), 'other binary stuff');

    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.advanceTimersByTime(100);

    await sleep(500);
    expect(loadModule).not.toHaveBeenCalled();


    fs.mock
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.log("hello again");');

    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.runOnlyPendingTimers();
    await sleep(5);
    jest.advanceTimersByTime(100);

    await sleep(500);

    expect(loadModule).toHaveBeenCalled();
  });
});
