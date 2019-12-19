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

const defaultExport = {
  option: jest.fn(() => defaultExport),
  demandOption: jest.fn(() => defaultExport),
};

const yargsMock = {
  __esModule: true,
  default: defaultExport,
  argv: { rootModuleName: 'frank-lloyd-root' },
};
jest.doMock('yargs', () => yargsMock);

const load = () => {
  jest.resetModules();
  require('../../../../src/server/config/env/argv');
};

const pathToModuleMap = path.join(process.cwd(), 'static', 'module-map.json');

let origModuleMapContents;

beforeAll(() => {
  if (fs.existsSync(pathToModuleMap)) {
    // eslint-disable-next-line import/no-dynamic-require
    origModuleMapContents = require(pathToModuleMap);
    fs.unlinkSync(pathToModuleMap);
  }
});

afterAll(() => {
  if (origModuleMapContents) {
    fs.writeFileSync(pathToModuleMap, JSON.stringify(origModuleMapContents));
  }
});

describe('argv config', () => {
  it('has production options and defaults', () => {
    process.env.NODE_ENV = 'production';
    yargsMock.default.option.mockClear();
    yargsMock.default.demandOption.mockClear();
    load();
    expect(yargsMock.default.option).toHaveBeenCalled();
    yargsMock.default.option.mock.calls.forEach((args) => {
      expect(args).toMatchSnapshot();
    });
  });

  it('has development options and defaults', () => {
    process.env.NODE_ENV = 'development';
    yargsMock.default.option.mockClear();
    yargsMock.default.demandOption.mockClear();
    jest.doMock(pathToModuleMap, () => ({ 'my-module': '1.0.0' }), { virtual: true });
    load();
    expect(yargsMock.default.option).toHaveBeenCalled();
    expect(yargsMock.default.demandOption).toHaveBeenCalled();
    yargsMock.default.option.mock.calls.forEach((args) => {
      expect(args).toMatchSnapshot();
    });
    expect(yargsMock.default.demandOption.mock.calls).toMatchSnapshot();
  });

  it('requires the `module-map-url` option if there are no locally served modules', () => {
    process.env.NODE_ENV = 'development';
    yargsMock.default.option.mockClear();
    yargsMock.default.demandOption.mockClear();
    jest.dontMock(pathToModuleMap);
    load();
    expect(yargsMock.default.demandOption).toHaveBeenCalled();
    expect(yargsMock.default.demandOption.mock.calls).toMatchSnapshot();
  });

  it('requires the `module-map-url` option if there is a local module map that is empty', () => {
    process.env.NODE_ENV = 'development';
    yargsMock.default.option.mockClear();
    yargsMock.default.demandOption.mockClear();
    jest.doMock(pathToModuleMap, () => ({}), { virtual: true });
    load();
    expect(yargsMock.default.demandOption).toHaveBeenCalled();
    expect(yargsMock.default.demandOption.mock.calls).toMatchSnapshot();
  });

  it('requires the `module-map-url` and `root-module-name` options if there is a local module map that is empty and the root module name env var is not set', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ONE_CLIENT_ROOT_MODULE_NAME;

    yargsMock.default.option.mockClear();
    yargsMock.default.demandOption.mockClear();
    jest.doMock(pathToModuleMap, () => ({}), { virtual: true });
    load();
    expect(yargsMock.default.demandOption).toHaveBeenCalled();
    expect(yargsMock.default.demandOption.mock.calls).toMatchSnapshot();
  });

  it('requires the `module-map-url` but not the `root-module-name` option if there is a local module map that is empty and the root module name env var is set', () => {
    process.env.NODE_ENV = 'development';
    process.env.ONE_CLIENT_ROOT_MODULE_NAME = 'frank-lloyd-root';
    yargsMock.argv = {};
    yargsMock.default.option.mockClear();
    yargsMock.default.demandOption.mockClear();
    jest.doMock(pathToModuleMap, () => ({}), { virtual: true });
    load();
    expect(yargsMock.default.demandOption).toHaveBeenCalled();
    expect(yargsMock.default.demandOption.mock.calls).toMatchSnapshot();
  });

  it('does not require either the `module-map-url` or the `root-module-name` option if there is a local module map and the root module name env var is set', () => {
    process.env.NODE_ENV = 'development';
    process.env.ONE_CLIENT_ROOT_MODULE_NAME = 'frank-lloyd-root';
    yargsMock.argv = {};
    yargsMock.default.option.mockClear();
    yargsMock.default.demandOption.mockClear();
    jest.doMock(pathToModuleMap, () => ({ 'my-module': '1.0.0' }), { virtual: true });
    load();
    expect(yargsMock.default.demandOption).not.toHaveBeenCalled();
  });

  it('throws if the `root-module-name` option is given while the root module name env var is also set', () => {
    process.env.NODE_ENV = 'development';
    process.env.ONE_CLIENT_ROOT_MODULE_NAME = 'frank-lloyd-root';
    yargsMock.argv = { rootModuleName: 'frank-lloyd-root' };
    yargsMock.default.option.mockClear();
    yargsMock.default.demandOption.mockClear();
    jest.doMock(pathToModuleMap, () => ({}), { virtual: true });
    expect(() => load()).toThrowErrorMatchingSnapshot();
  });
});
