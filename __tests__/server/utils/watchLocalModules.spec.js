/**
 * @jest-environment node
 */

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
import loadModule from 'holocron/loadModule.node';
import { getModules, resetModuleRegistry } from 'holocron/moduleRegistry';
import watchLocalModules from '../../../src/server/utils/watchLocalModules';

jest.mock('fs', () => {
  const fsActual = jest.requireActual('fs');
  const setImmediateNative = global.setImmediate;

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
    return parts.reduce((parentEntry, entryName) => {
      if (!parentEntry || !parentEntry.has('entries')) {
        return null;
      }
      return parentEntry.get('entries').get(entryName);
    }, mockedFilesystem);
  }

  let inodeCount = 0;
  function getNewInode() {
    inodeCount += 1;
    return inodeCount;
  }
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
            ino: getNewInode(),
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

      for (let i = 0; i < parts.length; i += 1) {
        const nextEntry = parts[i];
        if (
          parent.get('entries').has(nextEntry)
          && parent.get('entries').get(nextEntry).get('indicator') !== 'd'
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
                  ino: getNewInode(),
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
                ino: getNewInode(),
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
        [...entry.get('entries').entries()].forEach(([childName, childNode]) => {
          const childPath = `${parentPath}/${childName}`;
          if (!childNode) {
            throw new Error(`no child for ${childName}??`);
          }
          const indicator = childNode.get('indicator');
          printout += `${indicator} ${childPath}\n`;
          if (indicator === 'd') {
            printout += traverser(childPath, childNode);
          }
        });
        return printout;
      }

      const printout = traverser('', mockedFilesystem);
      console.info(printout);
      return mock;
    },
  };

  mock.clear();

  jest.spyOn(fsActual, 'readdir').mockImplementation((dirPath, callback) => {
    const parts = dirPath.split('/').filter(Boolean);
    const dir = getEntry(parts);
    if (!dir) {
      setImmediateNative(callback, new Error(`not in mock fs ${dirPath} (readdir)`));
      return;
    }
    if (dir.get('indicator') !== 'd') {
      setImmediateNative(callback, new Error(`not a mocked directory ${dirPath} (readdir)`));
      return;
    }

    setImmediateNative(callback, null, [...dir.get('entries').keys()]);
  });

  jest.spyOn(fsActual.promises, 'stat').mockImplementation(
    (fsPath) => new Promise((resolve, reject) => {
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
        new fsActual.Stats(
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

  fsActual.mock = mock;

  return fsActual;
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
jest.spyOn(console, 'info').mockImplementation(() => {});

describe('watchLocalModules', () => {
  let origOneAppDevCDNPort;
  beforeAll(() => {
    origOneAppDevCDNPort = process.env.HTTP_ONE_APP_DEV_CDN_PORT;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.HTTP_ONE_APP_DEV_CDN_PORT;
    fs.mock.clear();
    jest.spyOn(global, 'setTimeout').mockImplementation(() => ({ unref: jest.fn() }));
    jest.spyOn(global, 'setImmediate').mockImplementation(() => ({ unref: jest.fn() }));
  });
  afterEach(() => {
    setImmediate.mockClear();
    setTimeout.mockClear();
  });
  afterAll(() => {
    process.env.HTTP_ONE_APP_DEV_CDN_PORT = origOneAppDevCDNPort;
  });

  it('should tell the user when a module build was updated', async () => {
    expect.assertions(22);
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
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello");');

    // initiate watching
    watchLocalModules();

    expect(setTimeout).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();

    // run the first change poll
    await setImmediate.mock.calls[0][0]();

    expect(console.info).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(1);

    // run the second change poll, which should not see any filesystem changes
    await setTimeout.mock.calls[0][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(2);

    expect(getModules().get(moduleName)).toBe(originalModule);
    expect(console.info).not.toHaveBeenCalled();

    fs.mock
      .delete(path.resolve('static/modules', moduleName))
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello again");');
    loadModule.mockReturnValueOnce(Promise.resolve(updatedModule));

    // run the third change poll, which should see the filesystem changes
    await setTimeout.mock.calls[1][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    // first the changeWatcher is queued to run again
    // then the writesFinishWatcher is queued
    expect(setTimeout).toHaveBeenCalledTimes(4);
    expect(console.info).not.toHaveBeenCalled();

    // run the writesFinishWatcher poll
    await setTimeout.mock.calls[3][0]();

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(4);

    expect(console.info).not.toHaveBeenCalled();

    // run the change handler
    await setImmediate.mock.calls[1][0](setImmediate.mock.calls[1][1]);

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(4);

    expect(loadModule).toHaveBeenCalledTimes(1);
    expect(getModules().get(moduleName)).toBe(updatedModule);
    expect(console.info).toHaveBeenCalledTimes(2);
    expect(console.info.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "the Node.js bundle for some-module finished saving, attempting to load",
      ]
    `);
  });

  it('should tell the user when the updated module is loaded', async () => {
    expect.assertions(22);
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
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello");');

    // initiate watching
    watchLocalModules();

    expect(setTimeout).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();

    // run the first change poll
    await setImmediate.mock.calls[0][0]();

    expect(console.info).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(1);

    // run the second change poll, which should not see any filesystem changes
    await setTimeout.mock.calls[0][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(2);

    expect(getModules().get(moduleName)).toBe(originalModule);
    expect(console.info).not.toHaveBeenCalled();

    fs.mock
      .delete(path.resolve('static/modules', moduleName))
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello again");');
    loadModule.mockReturnValueOnce(Promise.resolve(updatedModule));

    // run the third change poll, which should see the filesystem changes
    await setTimeout.mock.calls[1][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    // first the changeWatcher is queued to run again
    // then the writesFinishWatcher is queued
    expect(setTimeout).toHaveBeenCalledTimes(4);
    expect(console.info).not.toHaveBeenCalled();

    // run the writesFinishWatcher poll
    await setTimeout.mock.calls[3][0]();

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(4);

    expect(console.info).not.toHaveBeenCalled();

    // run the change handler
    await setImmediate.mock.calls[1][0](setImmediate.mock.calls[1][1]);

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(4);

    expect(loadModule).toHaveBeenCalledTimes(1);
    expect(getModules().get(moduleName)).toBe(updatedModule);
    expect(console.info).toHaveBeenCalledTimes(2);
    expect(console.info.mock.calls[1]).toMatchInlineSnapshot(`
      Array [
        "finished reloading some-module",
      ]
    `);
  });

  it('should update the module registry when a server bundle changes', async () => {
    expect.assertions(23);
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
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello");');

    // initiate watching
    watchLocalModules();

    expect(setTimeout).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();

    // run the first change poll
    await setImmediate.mock.calls[0][0]();

    expect(console.info).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(1);

    // run the second change poll, which should not see any filesystem changes
    await setTimeout.mock.calls[0][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(2);

    expect(getModules().get(moduleName)).toBe(originalModule);
    expect(console.info).not.toHaveBeenCalled();

    fs.mock
      .delete(path.resolve('static/modules', moduleName))
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello again");');
    loadModule.mockReturnValueOnce(Promise.resolve(updatedModule));

    // run the third change poll, which should see the filesystem changes
    await setTimeout.mock.calls[1][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    // first the changeWatcher is queued to run again
    // then the writesFinishWatcher is queued
    expect(setTimeout).toHaveBeenCalledTimes(4);
    expect(console.info).not.toHaveBeenCalled();

    // run the writesFinishWatcher poll
    await setTimeout.mock.calls[3][0]();

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(4);

    expect(console.info).not.toHaveBeenCalled();

    // run the change handler
    await setImmediate.mock.calls[1][0](setImmediate.mock.calls[1][1]);

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(4);

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
    expect.assertions(20);
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
    const modules = fromJS({ [moduleName]: originalModule });
    const moduleMap = fromJS(moduleMapSample);
    resetModuleRegistry(modules, moduleMap);
    fs.mock
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello");');

    // initiate watching
    watchLocalModules();

    expect(setTimeout).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();

    // run the first change poll
    await setImmediate.mock.calls[0][0]();

    expect(console.info).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(1);

    // run the second change poll, which should not see any filesystem changes
    await setTimeout.mock.calls[0][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(2);

    expect(getModules().get(moduleName)).toBe(originalModule);
    expect(console.info).not.toHaveBeenCalled();

    fs.mock
      .delete(path.resolve('static/modules', moduleName))
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello again");');
    loadModule.mockImplementationOnce(() => Promise.reject(new Error('sample-module startup error')));

    // run the third change poll, which should see the filesystem changes
    await setTimeout.mock.calls[1][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    // first the changeWatcher is queued to run again
    // then the writesFinishWatcher is queued
    expect(setTimeout).toHaveBeenCalledTimes(4);
    expect(console.info).not.toHaveBeenCalled();

    // run the writesFinishWatcher poll
    await setTimeout.mock.calls[3][0]();

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(4);

    expect(console.info).not.toHaveBeenCalled();

    // run the change handler
    await setImmediate.mock.calls[1][0](setImmediate.mock.calls[1][1]);

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(4);

    expect(loadModule).toHaveBeenCalledTimes(1);
    expect(getModules().get(moduleName)).toBe(originalModule);
  });

  it('should wait if the file was written to since it was detected to have changed', async () => {
    expect.assertions(20);
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
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello");');

    // initiate watching
    watchLocalModules();

    expect(setTimeout).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();

    // run the first change poll
    await setImmediate.mock.calls[0][0]();

    expect(console.info).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(1);

    // run the second change poll, which should not see any filesystem changes
    await setTimeout.mock.calls[0][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(2);

    expect(getModules().get(moduleName)).toBe(originalModule);
    expect(console.info).not.toHaveBeenCalled();

    fs.mock
      .delete(path.resolve('static/modules', moduleName))
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("he');
    loadModule.mockImplementation(() => Promise.reject(new Error('sample-module startup error')));

    // run the third change poll, which should see the filesystem changes
    await setTimeout.mock.calls[1][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    // first the changeWatcher is queued to run again
    // then the writesFinishWatcher is queued
    expect(setTimeout).toHaveBeenCalledTimes(4);

    fs.mock.writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello again");');
    loadModule.mockClear().mockReturnValue(Promise.resolve(updatedModule));

    // run the writesFinishWatcher poll after the writing finishes
    await setTimeout.mock.calls[3][0]();

    // writesFinishWatcher should need to run again
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(5);

    expect(loadModule).not.toHaveBeenCalled();

    // run the writesFinishWatcher poll again, checks for further writes
    await setTimeout.mock.calls[4][0]();

    // writesFinishWatcher should NOT need to run again
    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(5);

    // run the change handler
    await setImmediate.mock.calls[1][0](setImmediate.mock.calls[1][1]);

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(5);

    expect(loadModule).toHaveBeenCalled();
  });

  it('should load a module that has since been built but was not on disk when the process started', async () => {
    expect.assertions(22);
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
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true });

    // initiate watching
    watchLocalModules();

    expect(setTimeout).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();

    // run the first change poll
    await setImmediate.mock.calls[0][0]();

    expect(console.info).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(1);

    // run the second change poll, which should not see any filesystem changes
    await setTimeout.mock.calls[0][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(2);

    expect(getModules().get(moduleName)).toBe(originalModule);
    expect(console.info).not.toHaveBeenCalled();

    fs.mock
      .delete(path.resolve('static/modules', moduleName))
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello again");');
    loadModule.mockReturnValueOnce(Promise.resolve(updatedModule));

    // run the third change poll, which should see the filesystem changes
    await setTimeout.mock.calls[1][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    // first the changeWatcher is queued to run again
    // then the writesFinishWatcher is queued
    expect(setTimeout).toHaveBeenCalledTimes(4);
    expect(console.info).not.toHaveBeenCalled();

    // run the writesFinishWatcher poll
    await setTimeout.mock.calls[3][0]();

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(4);

    expect(console.info).not.toHaveBeenCalled();

    // run the change handler
    await setImmediate.mock.calls[1][0](setImmediate.mock.calls[1][1]);

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(4);

    expect(loadModule).toHaveBeenCalledTimes(1);
    expect(getModules().get(moduleName)).toBe(updatedModule);
    expect(console.info).toHaveBeenCalledTimes(2);
    expect(console.info.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "the Node.js bundle for some-module finished saving, attempting to load",
      ]
    `);
  });

  it('should ignore modules that are not in the module map', async () => {
    expect.assertions(25);
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
      .mkdir(path.resolve('static/modules', 'other-module', '1.2.3'), { parents: true })
      .writeFile(path.resolve('static/modules', 'other-module', '1.2.3', `${'other-module'}.node.js`), 'console.info("hello");');

    loadModule.mockReturnValue(Promise.resolve(updatedModule));

    // initiate watching
    watchLocalModules();

    expect(setTimeout).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();

    // run the first change poll
    await setImmediate.mock.calls[0][0]();

    expect(console.info).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(1);

    // run the second change poll, which should not see any filesystem changes
    await setTimeout.mock.calls[0][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(2);

    expect(getModules().get(moduleName)).toBe(originalModule);
    expect(console.info).not.toHaveBeenCalled();

    fs.mock
      .delete(path.resolve('static/modules', moduleName))
      .mkdir(path.resolve('static/modules', 'other-module', '1.2.3'), { parents: true })
      .writeFile(path.resolve('static/modules', 'other-module', '1.2.3', `${'other-module'}.node.js`), 'console.info("hello");');

    // run the third change poll, which should see the filesystem changes
    await setTimeout.mock.calls[1][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    // first the changeWatcher is queued to run again
    // then the writesFinishWatcher is queued
    expect(setTimeout).toHaveBeenCalledTimes(4);

    // run the writesFinishWatcher poll after the writing finishes
    await setTimeout.mock.calls[3][0]();

    // writesFinishWatcher should need to run again
    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(4);

    // run the change handler
    await setImmediate.mock.calls[1][0](setImmediate.mock.calls[1][1]);

    expect(loadModule).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "module \\"other-module\\" not in the module map, make sure to serve-module first",
      ]
    `);

    // make sure this doesn't block modules in the module map from being reloaded
    fs.mock
      .delete(path.resolve('static/modules', moduleName))
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello again");');

    // run the changeWatcher poll
    await setTimeout.mock.calls[2][0]();

    expect(setImmediate).toHaveBeenCalledTimes(2);
    // first the changeWatcher is queued to run again
    // then the writesFinishWatcher is queued
    expect(setTimeout).toHaveBeenCalledTimes(6);

    expect(loadModule).not.toHaveBeenCalled();

    // run the writesFinishWatcher poll
    await setTimeout.mock.calls[5][0]();

    // writesFinishWatcher should NOT need to run again
    expect(setImmediate).toHaveBeenCalledTimes(3);
    expect(setTimeout).toHaveBeenCalledTimes(6);

    // run the change handler
    await setImmediate.mock.calls[2][0](setImmediate.mock.calls[2][1]);

    expect(setImmediate).toHaveBeenCalledTimes(3);
    expect(setTimeout).toHaveBeenCalledTimes(6);

    expect(loadModule).toHaveBeenCalled();
  });

  // instance when the CHANGE_WATCHER_INTERVAL and WRITING_FINISH_WATCHER_TIMEOUT lined up
  // we need to avoid scheduling the write watcher like a tree (many branches, eventually eating
  // all CPU and memory)
  it('should schedule watching for writes only once when both watchers have run', async () => {
    expect.assertions(13);
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
    const modules = fromJS({ [moduleName]: originalModule });
    const moduleMap = fromJS(moduleMapSample);
    resetModuleRegistry(modules, moduleMap);
    fs.mock
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello");');

    // initiate watching
    watchLocalModules();

    expect(setTimeout).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();

    // run the first change poll
    await setImmediate.mock.calls[0][0]();

    expect(console.info).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(1);

    // run the second change poll, which should not see any filesystem changes
    await setTimeout.mock.calls[0][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(2);

    expect(getModules().get(moduleName)).toBe(originalModule);
    expect(console.info).not.toHaveBeenCalled();

    fs.mock
      .delete(path.resolve('static/modules', moduleName))
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello again");');
    loadModule.mockImplementation(() => Promise.reject(new Error('sample-module startup error')));

    // run the third change poll, which should see the filesystem changes
    await setTimeout.mock.calls[1][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    // first the changeWatcher is queued to run again
    // then the writesFinishWatcher is queued
    expect(setTimeout).toHaveBeenCalledTimes(4);

    // there may be times that their intervals coincide
    // we don't want writesFinishWatcher to be scheduled twice
    await Promise.all([
      setTimeout.mock.calls[2][0](),
      setTimeout.mock.calls[3][0](),
    ]);

    expect(setTimeout).toHaveBeenCalledTimes(5);
  });

  it('should ignore changes to all bundles but the server bundle', async () => {
    expect.assertions(22);
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
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello Node.js");')
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.browser.js`), 'console.info("hello Browser");')
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.legacy.browser.js`), 'console.info("hello previous spec Browser");');

    // initiate watching
    watchLocalModules();

    expect(setTimeout).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();

    // run the first change poll
    await setImmediate.mock.calls[0][0]();

    expect(console.info).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(1);

    // run the second change poll, which should not see any filesystem changes
    await setTimeout.mock.calls[0][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(2);

    expect(getModules().get(moduleName)).toBe(originalModule);
    expect(console.info).not.toHaveBeenCalled();

    fs.mock
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.browser.js`), 'console.info("hello again Browser");')
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.legacy.browser.js`), 'console.info("hello again previous spec Browser");');
    loadModule.mockImplementation(() => Promise.reject(new Error('sample-module startup error')));

    // run the third change poll, which should see but ignore the filesystem changes
    await setTimeout.mock.calls[1][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(3);

    expect(loadModule).not.toHaveBeenCalled();

    fs.mock.writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello Node.js");');
    loadModule.mockClear().mockReturnValue(Promise.resolve(updatedModule));

    // run the fourth change poll, which should see the filesystem changes
    await setTimeout.mock.calls[2][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    // first the changeWatcher is queued to run again
    // then the writesFinishWatcher is queued
    expect(setTimeout).toHaveBeenCalledTimes(5);
    expect(console.info).not.toHaveBeenCalled();

    // run the writesFinishWatcher poll
    await setTimeout.mock.calls[4][0]();

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(5);

    expect(console.info).not.toHaveBeenCalled();

    // run the change handler
    await setImmediate.mock.calls[1][0](setImmediate.mock.calls[1][1]);

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(5);

    expect(loadModule).toHaveBeenCalled();
  });

  it('should ignore changes to server bundles that are not the module entrypoint', async () => {
    expect.assertions(22);
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
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello");')
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, 'vendors.node.js'), 'console.info("hi");');

    // initiate watching
    watchLocalModules();

    expect(setTimeout).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();

    // run the first change poll
    await setImmediate.mock.calls[0][0]();

    expect(console.info).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(1);

    // run the second change poll, which should not see any filesystem changes
    await setTimeout.mock.calls[0][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(2);

    expect(getModules().get(moduleName)).toBe(originalModule);
    expect(console.info).not.toHaveBeenCalled();

    fs.mock.writeFile(path.resolve('static/modules', moduleName, moduleVersion, 'vendors.node.js'), 'console.info("hi there");');
    loadModule.mockImplementation(() => Promise.reject(new Error('sample-module startup error')));

    // run the third change poll, which should see but ignore the filesystem changes
    await setTimeout.mock.calls[1][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(3);

    expect(loadModule).not.toHaveBeenCalled();

    fs.mock.writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello Node.js");');
    loadModule.mockClear().mockReturnValue(Promise.resolve(updatedModule));

    // run the fourth change poll, which should see the filesystem changes
    await setTimeout.mock.calls[2][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    // first the changeWatcher is queued to run again
    // then the writesFinishWatcher is queued
    expect(setTimeout).toHaveBeenCalledTimes(5);
    expect(console.info).not.toHaveBeenCalled();

    // run the writesFinishWatcher poll
    await setTimeout.mock.calls[4][0]();

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(5);

    expect(console.info).not.toHaveBeenCalled();

    // run the change handler
    await setImmediate.mock.calls[1][0](setImmediate.mock.calls[1][1]);

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(5);

    expect(loadModule).toHaveBeenCalled();
  });

  it('should ignore changes to files that are not JavaScript', async () => {
    expect.assertions(22);
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
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello");')
      .mkdir(path.resolve('static/modules', moduleName, moduleVersion, 'assets'), { parents: true })
      .writeFile(path.resolve('static/modules', moduleName, moduleVersion, 'assets', 'image.png'), 'binary stuff');

    // initiate watching
    watchLocalModules();

    expect(setTimeout).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();

    // run the first change poll
    await setImmediate.mock.calls[0][0]();

    expect(console.info).not.toHaveBeenCalled();
    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(1);

    // run the second change poll, which should not see any filesystem changes
    await setTimeout.mock.calls[0][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(2);

    expect(getModules().get(moduleName)).toBe(originalModule);
    expect(console.info).not.toHaveBeenCalled();

    fs.mock.writeFile(path.resolve('static/modules', moduleName, moduleVersion, 'assets', 'image.png'), 'other binary stuff');
    loadModule.mockImplementation(() => Promise.reject(new Error('sample-module startup error')));

    // run the third change poll, which should see but ignore the filesystem changes
    await setTimeout.mock.calls[1][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledTimes(3);

    expect(loadModule).not.toHaveBeenCalled();

    fs.mock.writeFile(path.resolve('static/modules', moduleName, moduleVersion, `${moduleName}.node.js`), 'console.info("hello Node.js");');
    loadModule.mockClear().mockReturnValue(Promise.resolve(updatedModule));

    // run the fourth change poll, which should see the filesystem changes
    await setTimeout.mock.calls[2][0]();

    expect(setImmediate).toHaveBeenCalledTimes(1);
    // first the changeWatcher is queued to run again
    // then the writesFinishWatcher is queued
    expect(setTimeout).toHaveBeenCalledTimes(5);
    expect(console.info).not.toHaveBeenCalled();

    // run the writesFinishWatcher poll
    await setTimeout.mock.calls[4][0]();

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(5);

    expect(console.info).not.toHaveBeenCalled();

    // run the change handler
    await setImmediate.mock.calls[1][0](setImmediate.mock.calls[1][1]);

    expect(setImmediate).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(5);

    expect(loadModule).toHaveBeenCalled();
  });
});
