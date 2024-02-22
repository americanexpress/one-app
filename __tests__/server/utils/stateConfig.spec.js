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

jest.mock('fs', () => ({ existsSync: jest.fn() }));
jest.mock('../../../src/server/utils/getIp', () => ({ getIp: jest.fn() }));
jest.mock('fake/path/.dev/endpoints/index.js', () => jest.fn(), { virtual: true });
jest.mock('yargs', () => ({ argv: {} }));
jest.mock('../../../src/server/utils/envVarAllowList', () => [
  'ONE_CLIENT_FAKE_SETTING',
  'ONE_FAKE_SETTING',
  'ONE_CLIENT_ANOTHER_SETTING',
  'ONE_CLIENT_SOME_OTHER_API_URL',
  'CLIENT_FAKE_SETTING',
]);

describe('stateConfig methods', () => {
  let setStateConfig;
  let getClientStateConfig;
  let getServerStateConfig;
  let provideStateConfig;
  let restoreModuleStateConfig;
  let backupModuleStateConfig;
  let fs;
  let getIp;
  let yargs;

  const originalEnvVars = process.env;

  const reloadMocks = () => {
    fs = require('fs');
    getIp = require('../../../src/server/utils/getIP').getIp;
    yargs = require('yargs');
    jest.spyOn(process, 'cwd').mockImplementation(() => 'fake/path/');
    getIp.mockImplementation(() => '127.0.0.1');
    yargs.argv = {};
    fs.existsSync.mockImplementation(() => false);
    process.env.ONE_CONFIG_ENV = 'qa';
    provideStateConfig = {
      someApiUrl: {
        client: {
          development: 'https://internet-origin-dev.example.com/some-api/v1',
          qa: 'https://internet-origin-qa.example.com/some-api/v1',
          production: 'https://internet-origin.example.com/some-api/v1',
        },
        server: {
          development: 'https://intranet-origin-dev.example.com/some-api/v1',
          qa: 'https://intranet-origin-qa.example.com/some-api/v1',
          production: 'https://intranet-origin.example.com/some-api/v1',
        },
      },
    };
  };
  describe('stateConfig', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      jest.resetModules();
      reloadMocks();
    });
    afterEach(() => {
      process.env = originalEnvVars;
    });
    describe('with module config', () => {
      beforeEach(() => {
        fs.existsSync.mockImplementation(() => false);
        ({
          setStateConfig,
          getClientStateConfig,
          getServerStateConfig,
          restoreModuleStateConfig,
          backupModuleStateConfig,
        } = require('../../../src/server/utils/stateConfig'));
      });
      it('should backup and restore process module config', () => {
        setStateConfig(provideStateConfig);
        const backup = backupModuleStateConfig();
        restoreModuleStateConfig(backup);
        expect(getClientStateConfig()).toMatchSnapshot();
        expect(getServerStateConfig()).toMatchSnapshot();
      });
      it('should throw if ONE_CONFIG_ENV is not set on parsing client', () => {
        jest.resetModules();
        delete process.env.ONE_CONFIG_ENV;
        delete provideStateConfig.someApiUrl.server;
        ({
          setStateConfig,
          getClientStateConfig,
          getServerStateConfig,
        } = require('../../../src/server/utils/stateConfig'));
        const execute = () => {
          setStateConfig(provideStateConfig);
        };
        expect(execute).toThrowErrorMatchingSnapshot();
      });
      it('should throw if ONE_CONFIG_ENV is not set on parsing server', () => {
        jest.resetModules();
        delete process.env.ONE_CONFIG_ENV;
        delete provideStateConfig.someApiUrl.client;
        ({
          setStateConfig,
          getClientStateConfig,
          getServerStateConfig,
        } = require('../../../src/server/utils/stateConfig'));
        const execute = () => {
          setStateConfig(provideStateConfig);
        };
        expect(execute).toThrowErrorMatchingSnapshot();
      });
      it('should set config with matching client server variables', () => {
        setStateConfig(provideStateConfig);
        expect(getClientStateConfig()).toMatchSnapshot();
        expect(getServerStateConfig()).toMatchSnapshot();
      });
      it('should throw if client variables are supplied without server variables', () => {
        delete provideStateConfig.someApiUrl.server;
        const execute = () => setStateConfig(provideStateConfig);
        expect(execute).toThrowErrorMatchingSnapshot();
      });
      it('should throw if server variables are supplied without client variables', () => {
        delete provideStateConfig.someApiUrl.client;
        const execute = () => setStateConfig(provideStateConfig);
        expect(execute).toThrowErrorMatchingSnapshot();
      });
      it('should set config if provided a string', () => {
        provideStateConfig = {
          someApiUrl: {
            client: 'https://internet-origin-string.example.com/some-api/v1',
            server: 'https://internet-origin-string.example.com/some-api/v1',
          },
        };
        setStateConfig(provideStateConfig);
        expect(getClientStateConfig()).toMatchSnapshot();
        expect(getServerStateConfig()).toMatchSnapshot();
      });
      it('should set config if provided a number', () => {
        provideStateConfig = {
          timeout: {
            client: 600000,
            server: 600000,
          },
        };
        setStateConfig(provideStateConfig);
        expect(getClientStateConfig()).toMatchSnapshot();
        expect(getServerStateConfig()).toMatchSnapshot();
      });
      it('should set config if provided a boolean', () => {
        provideStateConfig = {
          enableTest: {
            client: true,
            server: true,
          },
        };
        setStateConfig(provideStateConfig);
        expect(getClientStateConfig()).toMatchSnapshot();
        expect(getServerStateConfig()).toMatchSnapshot();
      });
      it('should not set config if provided not a string or object', () => {
        provideStateConfig = {
          someApiUrl: {
            client: null,
            server: null,
          },
        };
        setStateConfig(provideStateConfig);
        expect(getClientStateConfig()).toMatchSnapshot();
        expect(getServerStateConfig()).toMatchSnapshot();
      });
    });
    describe('with dev endpoint config', () => {
      beforeEach(() => {
        fs.existsSync.mockImplementation(() => true);
      });
      it('should show dev endpoint supplied config', () => {
        process.env.NODE_ENV = 'development';
        // eslint-disable-next-line unicorn/import-index, import/no-unresolved, import/extensions
        require('fake/path/.dev/endpoints/index.js').mockImplementation(() => ({
          someOtherApiUrl: {
            devProxyPath: 'some-other-api',
            destination: 'https://intranet-origin-dev.example.com/some-other-api/v1',
          },
        }));
        ({
          setStateConfig,
          getClientStateConfig,
          getServerStateConfig,
        } = require('../../../src/server/utils/stateConfig'));
        expect(getClientStateConfig()).toMatchSnapshot();
        expect(getServerStateConfig()).toMatchSnapshot();
      });
      it('dev endpoints should use ip instead of localhost when useHost is passed as arg', () => {
        process.env.NODE_ENV = 'development';
        yargs.argv = { useHost: true };
        // eslint-disable-next-line unicorn/import-index, import/no-unresolved, import/extensions
        require('fake/path/.dev/endpoints/index.js').mockImplementation(() => ({
          someOtherApiUrl: {
            devProxyPath: 'some-other-api',
            destination: 'https://intranet-origin-dev.example.com/some-other-api/v1',
          },
        }));
        ({
          setStateConfig,
          getClientStateConfig,
          getServerStateConfig,
        } = require('../../../src/server/utils/stateConfig'));
        expect(getClientStateConfig()).toMatchSnapshot();
        expect(getServerStateConfig()).toMatchSnapshot();
      });
      it('dev endpoint should not have doubled slash in path', () => {
        process.env.NODE_ENV = 'development';
        // eslint-disable-next-line unicorn/import-index, import/no-unresolved, import/extensions
        require('fake/path/.dev/endpoints/index.js').mockImplementation(() => ({
          leadingSlashApiUrl: {
            devProxyPath: '/leading-slash-api',
            destination: 'https://intranet-origin-dev.example.com/some-other-api/v1',
          },
        }));
        ({
          setStateConfig,
          getClientStateConfig,
          getServerStateConfig,
        } = require('../../../src/server/utils/stateConfig'));
        expect(getClientStateConfig().leadingSlashApiUrl).toEqual('http://localhost:3002/leading-slash-api');
      });
    });
    describe('with env vars', () => {
      it('should parse string undefined as js undefined', () => {
        process.env = {
          ONE_CLIENT_FAKE_SETTING: 'undefined',
        };
        ({
          setStateConfig,
          getClientStateConfig,
          getServerStateConfig,
        } = require('../../../src/server/utils/stateConfig'));
        expect(getClientStateConfig()).toMatchSnapshot();
        expect(getServerStateConfig()).toMatchSnapshot();
      });
      it('should set client env var to server and client config', () => {
        process.env = {
          ONE_CLIENT_FAKE_SETTING: 'client-fake-setting',
        };
        ({
          setStateConfig,
          getClientStateConfig,
          getServerStateConfig,
        } = require('../../../src/server/utils/stateConfig'));
        expect(getClientStateConfig()).toMatchSnapshot();
        expect(getServerStateConfig()).toMatchSnapshot();
      });
      it('should set server env var to just server config not client config', () => {
        process.env = {
          ...process.env,
          ONE_FAKE_SETTING: 'server-fake-setting',
        };
        ({
          setStateConfig,
          getClientStateConfig,
          getServerStateConfig,
        } = require('../../../src/server/utils/stateConfig'));
        expect(getClientStateConfig()).toMatchSnapshot();
        expect(getServerStateConfig()).toMatchSnapshot();
      });
      it('should set client env var to client config but not override server config if var already exists', () => {
        process.env = {
          ...process.env,
          ONE_FAKE_SETTING: 'server-fake-setting',
          ONE_CLIENT_FAKE_SETTING: 'client-fake-setting',
        };
        ({
          setStateConfig,
          getClientStateConfig,
          getServerStateConfig,
        } = require('../../../src/server/utils/stateConfig'));
        expect(getClientStateConfig()).toMatchSnapshot();
        expect(getServerStateConfig()).toMatchSnapshot();
      });
      it('should set client and server config from env var and merge with other variables', () => {
        process.env = {
          ...process.env,
          ONE_CLIENT_FAKE_SETTING: 'client-fake-setting',
          ONE_FAKE_SETTING: 'server-fake-setting',
          ONE_CLIENT_ANOTHER_SETTING: 'another-fake-setting',
        };
        ({
          setStateConfig,
          getClientStateConfig,
          getServerStateConfig,
        } = require('../../../src/server/utils/stateConfig'));
        expect(getClientStateConfig()).toMatchSnapshot();
        expect(getServerStateConfig()).toMatchSnapshot();
      });
      it('should ignore env vars not prefixed with ONE', () => {
        process.env = {
          ...process.env,
          CLIENT_FAKE_SETTING: 'client-fake-setting',
        };
        ({
          setStateConfig,
          getClientStateConfig,
          getServerStateConfig,
        } = require('../../../src/server/utils/stateConfig'));
        expect(getClientStateConfig()).toMatchSnapshot();
        expect(getServerStateConfig()).toMatchSnapshot();
      });
    });
    describe('with priorities of', () => {
      it('should prioritize dev endpoint over env', () => {
        fs.existsSync.mockImplementation(() => true);
        // eslint-disable-next-line unicorn/import-index, import/no-unresolved, import/extensions
        require('fake/path/.dev/endpoints/index.js').mockImplementation(() => ({
          someOtherApiUrl: {
            devProxyPath: 'some-other-api',
            destination: 'https://intranet-origin-dev.example.com/some-other-api/v1',
          },
        }));
        process.env = {
          ...process.env,
          NODE_ENV: 'development',
          ONE_CLIENT_SOME_OTHER_API_URL: 'some-other-api-url-env-var',
          ONE_CLIENT_FAKE_SETTING: 'client-fake-setting',
          ONE_FAKE_SETTING: 'server-fake-setting',
          ONE_CLIENT_ANOTHER_SETTING: 'another-fake-setting',
        };
        ({
          setStateConfig,
          getClientStateConfig,
          getServerStateConfig,
        } = require('../../../src/server/utils/stateConfig'));
        expect(getClientStateConfig()).toMatchSnapshot();
        expect(getServerStateConfig()).toMatchSnapshot();
      });
      it('should throw if module config tries to override env var', () => {
        provideStateConfig = {
          someOtherApiUrl: {
            client: {
              development: 'https://internet-origin-dev.example.com/some-api/v1',
              qa: 'https://internet-origin-qa.example.com/some-api/v1',
              production: 'https://internet-origin.example.com/some-api/v1',
            },
            server: {
              development: 'https://internet-origin-dev.example.com/some-api/v1',
              qa: 'https://internet-origin-qa.example.com/some-api/v1',
              production: 'https://internet-origin.example.com/some-api/v1',
            },
          },
        };
        process.env = {
          ...process.env,
          NODE_ENV: 'development',
          ONE_CLIENT_SOME_OTHER_API_URL: 'some-other-api-url-env-var',
          ONE_CLIENT_FAKE_SETTING: 'client-fake-setting',
          ONE_FAKE_SETTING: 'server-fake-setting',
          ONE_CLIENT_ANOTHER_SETTING: 'another-fake-setting',
        };
        ({
          setStateConfig,
          getClientStateConfig,
          getServerStateConfig,
        } = require('../../../src/server/utils/stateConfig'));
        const execute = () => setStateConfig(provideStateConfig);
        expect(execute).toThrowErrorMatchingSnapshot();
      });
      it('should throw if env overrides module config', () => {
        provideStateConfig = {
          someOtherApiUrl: {
            client: {
              development: 'https://internet-origin-dev.example.com/some-api/v1',
              qa: 'https://internet-origin-qa.example.com/some-api/v1',
              production: 'https://internet-origin.example.com/some-api/v1',
            },
            server: {
              development: 'https://internet-origin-dev.example.com/some-api/v1',
              qa: 'https://internet-origin-qa.example.com/some-api/v1',
              production: 'https://internet-origin.example.com/some-api/v1',
            },
          },
        };
        process.env = {
          ...process.env,
          NODE_ENV: 'development',
          ONE_CLIENT_SOME_OTHER_API_URL: 'some-other-api-url-env-var',
          ONE_CLIENT_FAKE_SETTING: 'client-fake-setting',
          ONE_FAKE_SETTING: 'server-fake-setting',
          ONE_CLIENT_ANOTHER_SETTING: 'another-fake-setting',
        };
        ({
          setStateConfig,
          getClientStateConfig,
          getServerStateConfig,
        } = require('../../../src/server/utils/stateConfig'));
        const execute = () => setStateConfig(provideStateConfig);
        expect(execute).toThrowErrorMatchingSnapshot();
      });
    });
  });
});
