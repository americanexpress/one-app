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

import { Map as ImmutableMap } from 'immutable';

jest.unmock('yargs');

describe('server index', () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const origFsExistsSync = fs.existsSync;

  let addServer;
  let shutdown;

  function load({
    ssrServerError,
    metricsServerError,
    getModuleImplementation = (/* name */) => (/* props */) => 'a react component',
    getModulesImplementation = new ImmutableMap({}),
    devHolocronCdnError,
    oneAppDevProxyError,
  } = {}) {
    process.argv = [
      '',
      '',
      '--module-map-url',
      'https://example.com/cdn/module-map.json',
      '--root-module-name',
      'frank-lloyd-root',
    ];

    jest.doMock('@americanexpress/one-app-dev-proxy', () => jest.fn(() => ({
      listen: jest.fn((port, cb) => {
        setTimeout(() => (oneAppDevProxyError ? cb(new Error('test error')) : cb(null, { port })));
        return { close: 'one-app-dev-proxy' };
      }),
    }))
    );

    jest.doMock('holocron', () => ({
      getModule: getModuleImplementation,
      getModules: () => getModulesImplementation,
    }));

    jest.doMock('cross-fetch');

    jest.doMock(
      '../../src/server/utils/loadModules',
      () => jest.fn(() => Promise.resolve())
    );
    jest.doMock('babel-polyfill', () => {
      // jest includes babel-polyfill
      // if included twice, babel-polyfill will complain that it should be only once
    });
    //
    jest.doMock('../../src/server/polyfill/intl');
    jest.doMock('../../src/server/utils/logging/setup', () => {});

    // ms timeouts are to ensure order
    jest.doMock('../../src/server/ssrServer', () => ({
      listen: jest.fn((port, cb) => {
        setTimeout(() => (ssrServerError ? cb(new Error('test error')) : cb(null, { port })), 50);
        return { close: 'ssrServer' };
      }),
    }));
    jest.doMock('../../src/server/metricsServer', () => ({
      listen: jest.fn((port, cb) => {
        setTimeout(() => (metricsServerError ? cb(new Error('test error')) : cb(null)), 10);
        return { close: 'metricsServer' };
      }),
    }));

    jest.doMock('../../src/server/listen', () => jest.fn(
      (app, cb) => app.listen(3000, (err) => cb(err, { port: 3000 }))
    ));

    addServer = jest.fn();
    shutdown = jest.fn();
    jest.doMock('../../src/server/shutdown', () => ({ addServer, shutdown }));

    jest.doMock('../../src/server/utils/pollModuleMap', () => jest.fn());
    jest.doMock('../../src/server/config/env/runTime', () => jest.fn());
    jest.doMock('../../src/server/utils/heapdump', () => {});
    jest.doMock('../../src/server/utils/watchLocalModules', () => ({ default: jest.fn() }));

    jest.doMock('../../src/server/devHolocronCDN', () => ({
      default: {
        listen: jest.fn((port, cb) => {
          setTimeout(() => (devHolocronCdnError ? cb(new Error('test error')) : cb(null, { port })));
          return { close: 'devHolocronCdn' };
        }),
      },
    }));
    jest.doMock('lean-intl', () => ({
      // eslint-disable-next-line no-underscore-dangle
      __addLocaleData: jest.fn(),
    }));

    return require('../../src/server').default;
  }

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('development', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.resetAllMocks();
      process.env.NODE_ENV = 'development';
      delete process.env.HTTP_ONE_APP_DEV_CDN_PORT;
    });

    it('sets up CLI for proxying and mocking of data', () => {
      load();
      const yargs = require('yargs');

      expect(yargs.getOptions().boolean).toMatchSnapshot();
      expect(yargs.getOptions().string).toMatchSnapshot();
    });

    it('starts devHolocronCDN on port 4011', async () => {
      process.env.HTTP_ONE_APP_DEV_CDN_PORT = 4011;
      await load();
      const devHolocronCDNListen = require('../../src/server/devHolocronCDN').default.listen;
      expect(devHolocronCDNListen.mock.calls[0][0]).toBe('4011');
    });

    it('starts one-app-dev-proxy with config derived from what is passed in CLI args', async () => {
      process.env.NODE_ENV = 'development';
      await load();
      const oneAppDevProxy = require('@americanexpress/one-app-dev-proxy');
      expect(oneAppDevProxy).toHaveBeenCalledTimes(1);
      expect(oneAppDevProxy.mock.calls[0][0]).toEqual({
        remotes: expect.any(Object),
        pathToMiddleware: expect.any(String),
        useMiddleware: undefined,
      });
    });

    it('starts one-app-dev-proxy with remotes derived from provided module endpoints file', async () => {
      const endpointsFilePath = path.join(process.cwd(), '.dev', 'endpoints', 'index.js');
      process.env.NODE_ENV = 'development';
      fs.existsSync = () => true;
      jest.doMock(endpointsFilePath, () => () => ({
        oneTestEndpointUrl: {
          devProxyPath: 'test',
          destination: 'https://example.com',
        },
      }),
      { virtual: true }
      );
      await load();
      fs.existsSync = origFsExistsSync;
      const oneAppDevProxy = require('@americanexpress/one-app-dev-proxy');
      expect(oneAppDevProxy).toHaveBeenCalledTimes(1);
      expect(oneAppDevProxy.mock.calls[0][0].remotes).toMatchSnapshot();
    });

    it('starts one-app-dev-proxy with out any remotes if there is no module endpoints file provided', async () => {
      const endpointsFilePath = path.join(process.cwd(), '.dev', 'endpoints', 'index.js');
      process.env.NODE_ENV = 'development';
      fs.existsSync = () => false;
      jest.doMock(endpointsFilePath, () => () => ({
        oneTestEndpointUrl: {
          devProxyPath: 'test',
          destination: 'https://example.com',
        },
      }),
      { virtual: true }
      );
      await load();
      fs.existsSync = origFsExistsSync;
      const oneAppDevProxy = require('@americanexpress/one-app-dev-proxy');
      expect(oneAppDevProxy).toHaveBeenCalledTimes(1);
      expect(oneAppDevProxy.mock.calls[0][0].remotes).toEqual({});
    });

    it('watches local modules for changes', async () => {
      await load();
      const watchLocalModules = require('../../src/server/utils/watchLocalModules').default;
      expect(watchLocalModules).toHaveBeenCalledTimes(1);
    });

    it('starts ssrServer', async () => {
      try {
        await load();
      } catch (error) {
        throw new Error(error);
      }
      const ssrServerListen = require('../../src/server/ssrServer').listen;

      expect(ssrServerListen).toHaveBeenCalledTimes(1);
    });

    it('initializes Intl with a locale', async () => {
      await load();
      // eslint-disable-next-line no-underscore-dangle
      expect(require('lean-intl').__addLocaleData.mock.calls[0][0]).toMatchObject({
        // contents dont have to exactly match just need to make sure that a locale object
        // is being added and not some random other thing
        date: expect.any(Object),
        locale: expect.any(String),
        number: expect.any(Object),
      });
    });

    it('starts metricsServer', async () => {
      try {
        await load();
      } catch (error) {
        throw new Error(error);
      }
      const metricsServerListen = require('../../src/server/metricsServer').listen;

      expect(metricsServerListen).toHaveBeenCalledTimes(1);
    });

    it('closes servers when starting devHolocronCDN fails', async () => {
      process.env.NODE_ENV = 'development';
      try {
        await load({ devHolocronCdnError: true });
      } catch (error) {
        throw new Error(error);
      }

      expect(shutdown).toHaveBeenCalledTimes(1);
    });

    it('closes servers when starting one-app-dev-proxy fails', async () => {
      process.env.NODE_ENV = 'development';
      try {
        await load({ oneAppDevProxyError: true });
      } catch (error) {
        throw new Error(error);
      }

      expect(shutdown).toHaveBeenCalledTimes(1);
    });
  });

  describe('production', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.resetAllMocks();
      process.env.NODE_ENV = 'production';
    });

    it('starts ssrServer', async () => {
      await load();
      const ssrServerListen = require('../../src/server/ssrServer').listen;

      expect(ssrServerListen).toHaveBeenCalledTimes(1);
    });

    it('starts metricsServer', async () => {
      await load();
      const metricsServerListen = require('../../src/server/metricsServer').listen;

      expect(metricsServerListen).toHaveBeenCalledTimes(1);
    });

    it('initializes Intl with a locale', async () => {
      await load();
      // eslint-disable-next-line no-underscore-dangle
      expect(require('lean-intl').__addLocaleData.mock.calls[0][0]).toMatchObject({
        // contents dont have to exactly match just need to make sure that a locale object
        // is being added and not some random other thing
        date: expect.any(Object),
        locale: expect.any(String),
        number: expect.any(Object),
      });
    });

    it('does not set up CLI for proxying and mocking of data', async () => {
      const yargs = require('yargs');
      const yargsOptionSpy = jest.spyOn(yargs, 'option');
      await load();

      const callsForProxyingAndMocking = yargsOptionSpy.mock.calls.filter(
        (args) => args[0] !== 'log-format' && args[0] !== 'log-level'
      );
      expect(callsForProxyingAndMocking).toHaveLength(0);
    });

    it('does not start devHolocronCDN', async () => {
      await load();
      const devHolocronCDNListen = require('../../src/server/devHolocronCDN').default.listen;

      expect(devHolocronCDNListen).not.toHaveBeenCalled();
    });

    it('does not watch local modules for changes', async () => {
      await load();
      const watchLocalModules = require('../../src/server/utils/watchLocalModules').default;
      expect(watchLocalModules).not.toHaveBeenCalled();
    });

    it('does not start one-app-dev-proxy', async () => {
      await load();
      const oneAppDevProxy = require('@americanexpress/one-app-dev-proxy');
      expect(oneAppDevProxy).not.toHaveBeenCalled();
    });
  });

  describe('ssrServerStart', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      delete process.env.ONE_CLIENT_ROOT_MODULE_NAME;
    });

    it('initializes holocron', async () => {
      await load();
      const loadModules = require('../../src/server/utils/loadModules');
      expect(loadModules).toHaveBeenCalledTimes(1);
    });

    it('starts server using a default http port if no env var for HTTP_PORT is given', async () => {
      delete process.env.HTTP_PORT;
      try {
        await load();
      } catch (error) {
        throw new Error(error);
      }
      const ssrServerListen = require('../../src/server/ssrServer').listen;

      expect(ssrServerListen.mock.calls[0][0]).toBe(3000);
    });

    it('logs errors when listening on the server fails', async () => {
      try {
        await load({ ssrServerError: true });
      } catch (error) {
        throw new Error(error);
      }

      expect(console.error).toHaveBeenCalled();
      expect(console.error.mock.calls[0][0]).toMatchSnapshot();
    });

    it('logs errors when listening on the metrics server fails', async () => {
      try {
        await load({ metricsServerError: true });
      } catch (error) {
        throw new Error(error);
      }

      expect(console.error).toHaveBeenCalled();
      expect(console.error.mock.calls[0][0]).toMatchSnapshot();
    });

    it('closes servers when starting ssrServer fails', async () => {
      process.env.NODE_ENV = 'development';
      try {
        await load({ ssrServerError: true });
      } catch (error) {
        throw new Error(error);
      }

      expect(shutdown).toHaveBeenCalledTimes(1);
    });

    it('logs when server is successfully listening on the port', async () => {
      console.log.mockClear();
      try {
        await load();
      } catch (error) {
        throw new Error(error);
      }

      expect(console.log).toHaveBeenCalled();
      expect(console.log.mock.calls[1][0]).toMatch('🌎 One App server listening on port 3000');
    });

    it('logs when metrics server is successfully listening on the port', async () => {
      console.log.mockClear();
      process.env.HTTP_METRICS_PORT = 3005;
      try {
        await load();
      } catch (error) {
        throw new Error(error);
      }

      expect(console.log).toHaveBeenCalled();
      expect(console.log.mock.calls[0][0]).toMatch('📊 Metrics server listening on port 3005');
    });

    it('initiates module-map polling if successfully listening on port', async () => {
      try {
        await load();
      } catch (error) {
        throw new Error(error);
      }
      const pollModuleMap = require('../../src/server/utils/pollModuleMap');

      expect(pollModuleMap).toHaveBeenCalledTimes(1);
    });

    afterAll(() => {
      delete process.env.ONE_CLIENT_ROOT_MODULE_NAME;
    });
  });

  describe('shutdown', () => {
    it('adds the one-app-dev-cdn to the shutdown list in development', async () => {
      process.env.NODE_ENV = 'development';
      await load();
      expect(addServer).toHaveBeenCalledTimes(4);
      expect(addServer.mock.calls[0][0]).toHaveProperty('close', 'devHolocronCdn');
    });

    it('adds the one-app-dev-proxy to the shutdown list in development', async () => {
      process.env.NODE_ENV = 'development';
      await load();
      expect(addServer).toHaveBeenCalledTimes(4);
      expect(addServer.mock.calls[1][0]).toHaveProperty('close', 'one-app-dev-proxy');
    });

    it('adds the metricsServer to the shutdown list in development', async () => {
      process.env.NODE_ENV = 'development';
      await load();
      expect(addServer).toHaveBeenCalledTimes(4);
      expect(addServer.mock.calls[2][0]).toHaveProperty('close', 'metricsServer');
    });

    it('adds the ssrServer to the shutdown list in development', async () => {
      process.env.NODE_ENV = 'development';
      await load();
      expect(addServer).toHaveBeenCalledTimes(4);
      expect(addServer.mock.calls[3][0]).toHaveProperty('close', 'ssrServer');
    });

    it('does not add the one-app-dev-cdn to the shutdown list in production', async () => {
      process.env.NODE_ENV = 'production';
      await load();
      expect(addServer).toHaveBeenCalledTimes(2);
      expect(addServer.mock.calls[0][0]).not.toHaveProperty('close', 'devHolocronCdn');
      expect(addServer.mock.calls[1][0]).not.toHaveProperty('close', 'devHolocronCdn');
    });

    it('does not add the one-app-dev-proxy to the shutdown list in production', async () => {
      process.env.NODE_ENV = 'production';
      await load();
      expect(addServer).toHaveBeenCalledTimes(2);
      expect(addServer.mock.calls[0][0]).not.toHaveProperty('close', 'oneAppDevProxy');
      expect(addServer.mock.calls[1][0]).not.toHaveProperty('close', 'oneAppDevProxy');
    });

    it('adds the metricsServer to the shutdown list in production', async () => {
      process.env.NODE_ENV = 'production';
      await load();
      expect(addServer).toHaveBeenCalledTimes(2);
      expect(addServer.mock.calls[0][0]).toHaveProperty('close', 'metricsServer');
    });

    it('adds the ssrServer to the shutdown list in production', async () => {
      process.env.NODE_ENV = 'production';
      await load();
      expect(addServer).toHaveBeenCalledTimes(2);
      expect(addServer.mock.calls[1][0]).toHaveProperty('close', 'ssrServer');
    });
  });
});
