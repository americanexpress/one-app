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

import util from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

import { Map as ImmutableMap } from 'immutable';

jest.unmock('yargs');

jest.spyOn(console, 'log').mockImplementation(util.format);
jest.spyOn(console, 'error').mockImplementation((...args) => {
  args.pop();
  return util.format(...args);
});
jest.spyOn(console, 'info').mockImplementation(util.format);
jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
jest.spyOn(process.stderr, 'write').mockImplementation(() => {});

describe('server index', () => {
  const origFsExistsSync = fs.existsSync;

  let addServer;
  let shutdown;
  let ssrServer;
  let ssrServerListen;
  let devHolocronCDNListen;
  let metricsServerListen;

  async function load({
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

    jest.doMock('@americanexpress/one-app-dev-proxy', () => ({
      default: jest.fn(() => ({
        listen: jest.fn((port, cb) => {
          setTimeout(() => (oneAppDevProxyError ? cb(new Error('test error')) : cb(null, { port }))
          );
          return { close: 'one-app-dev-proxy' };
        }),
      })),
    }));

    jest.doMock('holocron', () => ({
      getModule: getModuleImplementation,
      getModules: () => getModulesImplementation,
    }));

    jest.doMock('cross-fetch');

    jest.doMock('../../src/server/utils/loadModules', () => jest.fn(() => Promise.resolve()));
    jest.doMock('../../src/server/polyfill/intl');
    jest.doMock('../../src/server/utils/logging/monkeyPatchConsole', () => {});

    ssrServerListen = jest.fn(async () => {
      if (ssrServerError) {
        const error = new Error('ssr server test error');
        error.stack = `${error.toString()}\n    at <anonymous>:1:1`;
        throw error;
      }
    });
    ssrServer = jest.fn(() => ({
      listen: ssrServerListen,
      close: async () => 'ssrServer',
    }));
    jest.doMock('../../src/server/ssrServer', () => ssrServer);

    metricsServerListen = jest.fn(async () => {
      if (metricsServerError) {
        const error = new Error('metrics server test error');
        error.stack = `${error.toString()}\n    at <anonymous>:1:1`;
        throw error;
      }
    });
    jest.doMock('../../src/server/metricsServer', () => () => ({
      listen: metricsServerListen,
      close: async () => 'metricsServer',
    }));

    devHolocronCDNListen = jest.fn(async () => {
      if (devHolocronCdnError) {
        throw new Error('dev cdn test error');
      }
    });
    jest.doMock('../../src/server/devHolocronCDN', () => ({
      default: () => ({
        listen: devHolocronCDNListen,
        close: async () => 'devHolocronCdn',
      }),
    }));

    addServer = jest.fn();
    shutdown = jest.fn();
    jest.doMock('../../src/server/shutdown', () => ({ addServer, shutdown }));
    jest.doMock('../../src/server/utils/pollModuleMap', () => jest.fn());
    jest.doMock('../../src/server/config/env/runTime', () => jest.fn());
    jest.doMock('../../src/server/utils/heapdump', () => {});
    jest.doMock('../../src/server/utils/watchLocalModules', () => ({ default: jest.fn() }));
    jest.doMock('../../src/server/utils/getHttpsConfig', () => () => 'https-config-mock');

    jest.doMock('lean-intl', () => ({
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
      expect(devHolocronCDNListen).toHaveBeenCalledWith({ host: '0.0.0.0', port: '4011' });
    });

    it('starts one-app-dev-proxy with config derived from what is passed in CLI args', async () => {
      process.env.NODE_ENV = 'development';
      await load();
      const oneAppDevProxy = require('@americanexpress/one-app-dev-proxy').default;
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
      jest.doMock(
        endpointsFilePath,
        () => () => ({
          oneTestEndpointUrl: {
            devProxyPath: 'test',
            destination: 'https://example.com',
          },
        }),
        { virtual: true }
      );
      await load();
      fs.existsSync = origFsExistsSync;
      const oneAppDevProxy = require('@americanexpress/one-app-dev-proxy').default;
      expect(oneAppDevProxy).toHaveBeenCalledTimes(1);
      expect(oneAppDevProxy.mock.calls[0][0].remotes).toMatchSnapshot();
    });

    it('starts one-app-dev-proxy with out any remotes if there is no module endpoints file provided', async () => {
      const endpointsFilePath = path.join(process.cwd(), '.dev', 'endpoints', 'index.js');
      process.env.NODE_ENV = 'development';
      fs.existsSync = () => false;
      jest.doMock(
        endpointsFilePath,
        () => () => ({
          oneTestEndpointUrl: {
            devProxyPath: 'test',
            destination: 'https://example.com',
          },
        }),
        { virtual: true }
      );
      await load();
      fs.existsSync = origFsExistsSync;
      const oneAppDevProxy = require('@americanexpress/one-app-dev-proxy').default;
      expect(oneAppDevProxy).toHaveBeenCalledTimes(1);
      expect(oneAppDevProxy.mock.calls[0][0].remotes).toEqual({});
    });

    it('starts ssrServer', async () => {
      process.env.HTTP_PORT = 3000;
      await load();
      expect(ssrServerListen).toHaveBeenCalledWith({ host: '0.0.0.0', port: '3000' });
    });

    it('watches local modules for changes', async () => {
      await load();
      const watchLocalModules = require('../../src/server/utils/watchLocalModules').default;
      expect(watchLocalModules).toHaveBeenCalledTimes(1);
    });

    it('initializes Intl with a locale', async () => {
      await load();
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
      process.env.NODE_ENV = 'production';
    });

    it('starts ssrServer', async () => {
      await load();

      expect(ssrServerListen).toHaveBeenCalledTimes(1);
    });

    it('starts metricsServer', async () => {
      await load();

      expect(metricsServerListen).toHaveBeenCalledTimes(1);
    });

    it('initializes Intl with a locale', async () => {
      await load();
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

      expect(devHolocronCDNListen).not.toHaveBeenCalled();
    });

    it('does not watch local modules for changes', async () => {
      await load();
      const watchLocalModules = require('../../src/server/utils/watchLocalModules').default;
      expect(watchLocalModules).not.toHaveBeenCalled();
    });

    it('does not start one-app-dev-proxy', async () => {
      await load();
      const oneAppDevProxy = require('@americanexpress/one-app-dev-proxy').default;
      expect(oneAppDevProxy).not.toHaveBeenCalled();
    });
  });

  describe('ssrServerStart', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      delete process.env.ONE_CLIENT_ROOT_MODULE_NAME;
      delete process.env.HTTPS_PORT;
    });

    it('initializes holocron', async () => {
      await load();
      const loadModules = require('../../src/server/utils/loadModules');
      expect(loadModules).toHaveBeenCalledTimes(1);
    });

    it('starts server using a default http port if no env var for HTTP_PORT is given', async () => {
      delete process.env.HTTP_PORT;

      await load();

      expect(ssrServerListen.mock.calls[0][0]).toEqual({ host: '0.0.0.0', port: 3000 });
    });

    it('starts https server when HTTPS_PORT is present', async () => {
      process.env.HTTPS_PORT = 5555;

      await load();

      expect(ssrServerListen).toHaveBeenCalledWith({ host: '0.0.0.0', port: '5555' });
      expect(ssrServer).toHaveBeenCalledWith({ https: 'https-config-mock' });
    });

    it('logs errors when listening on the server fails', async () => {
      await load({ ssrServerError: true });

      expect(console.error).toHaveBeenCalled();
      expect(console.error.mock.results[0].value).toMatchInlineSnapshot(
        '"Error encountered starting 🌎 One App server"'
      );
    });

    it('does not log a notice directly to STDERR when not using OTel and listening on the server fails', async () => {
      delete process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
      await load({ ssrServerError: true });
      expect(process.stderr.write).not.toHaveBeenCalled();
    });

    it('logs a notice directly to STDERR when using OTel and listening on the server fails', async () => {
      process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = 'http://0.0.0.0:4317/v1/logs';
      await load({ ssrServerError: true });
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
      expect(process.stderr.write.mock.calls[0][0]).toMatchInlineSnapshot(`
        "
        one-app failed to start. Logs are being sent to OTel via gRPC at http://0.0.0.0:4317/v1/logs

        Error: ssr server test error
            at <anonymous>:1:1"
      `);
      delete process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
    });

    it('logs errors when listening on the metrics server fails', async () => {
      await load({ metricsServerError: true });

      expect(console.error).toHaveBeenCalled();
      expect(console.error.mock.results[0].value).toMatchInlineSnapshot(
        '"Error encountered starting 📊 Metrics server"'
      );
    });

    it('does not log a notice directly to STDERR when not using OTel and listening on the metrics server fails', async () => {
      delete process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
      await load({ metricsServerError: true });
      expect(process.stderr.write).not.toHaveBeenCalled();
    });

    it('logs a notice directly to STDERR when using OTel and listening on the metrics server fails', async () => {
      process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = 'http://0.0.0.0:4317/v1/logs';
      await load({ metricsServerError: true });
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
      expect(process.stderr.write.mock.calls[0][0]).toMatchInlineSnapshot(`
        "
        one-app failed to start. Logs are being sent to OTel via gRPC at http://0.0.0.0:4317/v1/logs

        Error: metrics server test error
            at <anonymous>:1:1"
      `);
      delete process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
    });

    it('closes servers when starting ssrServer fails', async () => {
      process.env.NODE_ENV = 'development';

      await load({ ssrServerError: true });

      expect(shutdown).toHaveBeenCalledTimes(1);
    });

    it('logs when server is successfully listening on the port', async () => {
      console.log.mockClear();

      await load();

      expect(console.log).toHaveBeenCalled();

      expect(console.log.mock.results[0].value).toMatchInlineSnapshot(
        '"🚀 One App Server is running on http://localhost:3000 🚀"'
      );
    });

    it('logs when metrics server is successfully listening on the port', async () => {
      console.log.mockClear();
      process.env.HTTP_METRICS_PORT = 3005;

      await load();

      expect(console.info).toHaveBeenCalled();
      expect(console.info.mock.results[0].value).toMatchInlineSnapshot(
        '"📊 Metrics server listening on port 3005"'
      );
    });

    it('initiates module-map polling if successfully listening on port', async () => {
      await load();

      const pollModuleMap = require('../../src/server/utils/pollModuleMap');

      expect(pollModuleMap).toHaveBeenCalledTimes(1);
    });

    it('does not log a notice to STDOUT when not using OTel', async () => {
      delete process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
      await load();
      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it('logs a notice to STDOUT when using OTel', async () => {
      process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = 'http://0.0.0.0:4317/v1/logs';
      await load();
      expect(process.stdout.write).toHaveBeenCalledTimes(1);
      expect(process.stdout.write.mock.calls[0][0]).toMatchInlineSnapshot(`
        "
        one-app started successfully. Logs are being sent to OTel via gRPC at http://0.0.0.0:4317/v1/logs
        "
      `);
      delete process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
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
      expect(await addServer.mock.calls[0][0].close()).toBe('devHolocronCdn');
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
      expect(await addServer.mock.calls[2][0].close()).toBe('metricsServer');
    });

    it('adds the ssrServer to the shutdown list in development', async () => {
      process.env.NODE_ENV = 'development';
      await load();
      expect(addServer).toHaveBeenCalledTimes(4);
      expect(await addServer.mock.calls[3][0].close()).toBe('ssrServer');
    });

    it('does not add the one-app-dev-cdn to the shutdown list in production', async () => {
      process.env.NODE_ENV = 'production';
      await load();
      expect(addServer).toHaveBeenCalledTimes(2);
      expect(await addServer.mock.calls[0][0].close()).not.toBe('devHolocronCdn');
      expect(await addServer.mock.calls[1][0].close()).not.toBe('devHolocronCdn');
    });

    it('does not add the one-app-dev-proxy to the shutdown list in production', async () => {
      process.env.NODE_ENV = 'production';
      await load();
      expect(addServer).toHaveBeenCalledTimes(2);
      expect(await addServer.mock.calls[0][0].close()).not.toBe('oneAppDevProxy');
      expect(await addServer.mock.calls[1][0].close()).not.toBe('oneAppDevProxy');
    });

    it('adds the metricsServer to the shutdown list in production', async () => {
      process.env.NODE_ENV = 'production';
      await load();
      expect(addServer).toHaveBeenCalledTimes(2);
      expect(await addServer.mock.calls[0][0].close()).toBe('metricsServer');
    });

    it('adds the ssrServer to the shutdown list in production', async () => {
      process.env.NODE_ENV = 'production';
      await load();
      expect(addServer).toHaveBeenCalledTimes(2);
      expect(await addServer.mock.calls[1][0].close()).toBe('ssrServer');
    });
  });
});
