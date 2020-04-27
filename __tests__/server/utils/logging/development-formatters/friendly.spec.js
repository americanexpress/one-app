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

import ora from 'ora';

import { beforeWrite, afterWrite, formatter } from '../../../../../src/server/utils/logging/development-formatters/friendly';

jest.mock('chalk');

jest.mock('ora', () => {
  const mockOra = jest.fn((opts) => {
    const spinner = {
      __opts: opts,
      start: jest.fn(() => spinner),
      stop: jest.fn(() => spinner),
      succeed: jest.fn(() => spinner),
      fail: jest.fn(() => spinner),
      warn: jest.fn(() => spinner),
      info: jest.fn(() => spinner),
      stopAndPersist: jest.fn(() => spinner),
      clear: jest.fn(() => spinner),
      render: jest.fn(() => spinner),
      frame: jest.fn(() => spinner),
      text: jest.fn(() => spinner),
      color: jest.fn(() => spinner),
    };

    mockOra.mock.returns.push(spinner);

    return spinner;
  });

  mockOra.mock.returns = [];

  const origMockClear = mockOra.mockClear;
  mockOra.mockClear = (...args) => {
    mockOra.mock.returns = [];
    return origMockClear.apply(this, args);
  };

  return mockOra;
});

const [
  oneAppDevCdnSpinner,
  oneAppDevProxySpinner,
  metricsServerSpinner,
  appServerSpinner,
  moduleMapSpinner,
] = ora.mock.returns;

describe('friendly', () => {
  describe('beforeWrite', () => {
    it('is a function', () => expect(beforeWrite).toBeInstanceOf(Function));

    it('clears all active spinners', () => {
      oneAppDevCdnSpinner.isEnabled = true;
      oneAppDevCdnSpinner.clear.mockClear();
      expect(oneAppDevCdnSpinner.clear).not.toHaveBeenCalled();
      beforeWrite();
      expect(oneAppDevCdnSpinner.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('afterWrite', () => {
    it('is a function', () => expect(afterWrite).toBeInstanceOf(Function));

    it('starts all active spinners', () => {
      oneAppDevCdnSpinner.isEnabled = true;
      oneAppDevCdnSpinner.start.mockClear();
      expect(oneAppDevCdnSpinner.start).not.toHaveBeenCalled();
      afterWrite();
      expect(oneAppDevCdnSpinner.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('formatter', () => {
    it('prints the level with color', () => {
      expect(formatter('error', 'hello')).toMatchSnapshot();
    });

    it('pretty-prints an incoming request', () => {
      const entry = {
        type: 'request',
        request: {
          direction: 'in',
          protocol: 'https',
          address: {
            uri: 'https://example.com/resource',
          },
          metaData: {
            method: 'GET',
            correlationId: '123',
            // null to explicitly signal no value, undefined if not expected for every request
            host: 'example.com',
            referrer: 'https://example.com/other-resource',
            userAgent: 'Browser/9.0 (compatible; ABCD 100.0; Doors OZ 81.4; Plane/1.0)',
            location: undefined,
          },
          timings: {
            duration: 13,
            ttfb: 12,
          },
          statusCode: 200,
          statusText: 'OK',
        },
      };
      expect(formatter('error', entry)).toMatchSnapshot();
    });

    it('skips showing external-request types', () => {
      expect(formatter('error', {
        type: 'request',
        request: {
          direction: 'out',
          protocol: 'https',
          address: {
            uri: 'https://example.com/resource',
          },
          metaData: {
            method: 'GET',
            // null to explicitly signal no value, undefined if not expected for every request
            correlationId: '123',
          },
          timings: {
            duration: 13,
          },
          statusCode: 200,
          statusText: 'OK',
        },
      })).toBe(null);
    });

    describe('unknown type', () => {
      it('is formatted by util.format', () => {
        expect(formatter('error', 'hello, %s', 'world')).toMatchSnapshot();
      });
    });

    describe('startup', () => {
      describe('environment configuration', () => {
        it('skips writing warnings of using server config values for the client', () => {
          expect(formatter('error', 'WARNING: ONE_CLIENT_SAMPLE_URL unspecified, using ONE_SAMPLE_URL')).toBe(null);
        });

        it('skips writing the end result of a validated and processes env var', () => {
          expect(formatter('error', 'env var ONE_SAMPLE_URL=https://example.org (string)')).toBe(null);
        });

        it('skips writing the compiled client configuration', () => {
          expect(formatter('error', 'client config setup from process.env:', { client: true })).toBe(null);
        });

        it('skips writing the compiled server configuration', () => {
          expect(formatter('error', 'server config setup from process.env:', { server: true })).toBe(null);
        });
      });

      describe('one-app-dev-cdn starts up successfully', () => {
        it('stops the oneAppDevCdnSpinner with success', () => {
          oneAppDevCdnSpinner.succeed.mockClear();
          formatter('level', '👕 one-app-dev-cdn server listening on port 3001');
          expect(oneAppDevCdnSpinner.succeed).toHaveBeenCalledTimes(1);
          expect(oneAppDevCdnSpinner.isEnabled).toBe(false);
        });

        it('starts the oneAppDevProxySpinner when one-app-dev-cdn starts up successfully', () => {
          oneAppDevProxySpinner.start.mockClear();
          formatter('level', '👕 one-app-dev-cdn server listening on port 3001');
          expect(oneAppDevProxySpinner.start).toHaveBeenCalledTimes(1);
          expect(oneAppDevProxySpinner.isEnabled).toBe(true);
        });

        it('skips writing the log statement', () => {
          expect(formatter('error', '👕 one-app-dev-cdn server listening on port 3001')).toBe(null);
        });
      });

      describe('one-app-dev-proxy starts up successfully', () => {
        it('stops the oneAppDevProxySpinner with success', () => {
          oneAppDevProxySpinner.succeed.mockClear();
          formatter('level', '👖 one-app-dev-proxy server listening on port 3002');
          expect(oneAppDevProxySpinner.succeed).toHaveBeenCalledTimes(1);
          expect(oneAppDevProxySpinner.isEnabled).toBe(false);
        });

        it('starts the appServerSpinner and metricsServerSpinner when one-app-dev-proxy starts up successfully', () => {
          appServerSpinner.start.mockClear();
          metricsServerSpinner.start.mockClear();
          formatter('level', '👖 one-app-dev-proxy server listening on port 3002');
          expect(appServerSpinner.start).toHaveBeenCalledTimes(1);
          expect(appServerSpinner.isEnabled).toBe(true);
          expect(metricsServerSpinner.start).toHaveBeenCalledTimes(1);
          expect(metricsServerSpinner.isEnabled).toBe(true);
        });

        it('skips writing the log statement', () => {
          expect(formatter('error', '👖 one-app-dev-proxy server listening on port 3002')).toBe(null);
        });
      });

      describe('ssrServer starts up successfully', () => {
        it('stops the appServerSpinner with success', () => {
          appServerSpinner.succeed.mockClear();
          formatter('level', '🌎 One App server listening on port 3000');
          expect(appServerSpinner.succeed).toHaveBeenCalledTimes(1);
          expect(appServerSpinner.isEnabled).toBe(false);
        });

        it('skips writing the log statement', () => {
          expect(formatter('error', '🌎 One App server listening on port 3000')).toBe(null);
        });
      });

      describe('metrics server starts up successfully', () => {
        it('stops the metricsServerSpinner with success', () => {
          metricsServerSpinner.succeed.mockClear();
          formatter('level', '📊 Metrics server listening on port');
          expect(metricsServerSpinner.succeed).toHaveBeenCalledTimes(1);
          expect(metricsServerSpinner.isEnabled).toBe(false);
        });

        it('skips writing the log statement', () => {
          expect(formatter('error', '📊 Metrics server listening on port')).toBe(null);
        });
      });

      describe('ssrServer bootstrap of holocron module loading failed', () => {
        it('stops the appServerSpinner with failure when it is enabled', () => {
          appServerSpinner.fail.mockClear();
          appServerSpinner.isEnabled = true;
          jest.spyOn(global, 'setImmediate').mockClear();
          formatter('level', 'Failed to load Holocron module (modulesPath/moduleName/version/moduleName.server.js)');
          expect(setImmediate).toHaveBeenCalledTimes(1);
          setImmediate.mock.calls[0][0]();
          expect(appServerSpinner.fail).toHaveBeenCalledTimes(1);
          expect(appServerSpinner.fail.mock.calls[0]).toMatchSnapshot();
          expect(appServerSpinner.isEnabled).toBe(false);
        });

        it('stops the appServerSpinner with failure when the root module is not in the module map', () => {
          appServerSpinner.fail.mockClear();
          appServerSpinner.isEnabled = true;
          jest.spyOn(global, 'setImmediate').mockClear();
          formatter('level', new Error('unable to find root module "not-in-module-map" in the module map'));
          expect(setImmediate).toHaveBeenCalledTimes(1);
          setImmediate.mock.calls[0][0]();
          expect(appServerSpinner.fail).toHaveBeenCalledTimes(1);
          expect(appServerSpinner.fail.mock.calls[0]).toMatchSnapshot();
          expect(appServerSpinner.isEnabled).toBe(false);
        });

        it('leaves a disabled appServerSpinner alone when it is not enabled', () => {
          appServerSpinner.fail.mockClear();
          appServerSpinner.isEnabled = false;
          jest.spyOn(global, 'setImmediate').mockClear();
          formatter('level', 'Failed to load Holocron module (modulesPath/moduleName/version/moduleName.server.js)');
          expect(setImmediate).not.toHaveBeenCalled();
          expect(appServerSpinner.fail).not.toHaveBeenCalled();
          expect(appServerSpinner.isEnabled).toBe(false);
        });

        it('skips writing the log statement when the appServerSpinner is enabled', () => {
          appServerSpinner.isEnabled = true;
          expect(formatter('error', 'Failed to load Holocron module (modulesPath/moduleName/version/moduleName.server.js)')).toBe(null);
        });

        it('writes the log statement when the appServerSpinner is not enabled', () => {
          appServerSpinner.isEnabled = false;
          expect(formatter('error', 'Failed to load Holocron module (modulesPath/moduleName/version/moduleName.server.js)')).not.toBe(null);
        });
      });
    });

    describe('module map polling', () => {
      describe('starts', () => {
        it('starts the moduleMapSpinner', () => {
          moduleMapSpinner.start.mockClear();
          jest.spyOn(global, 'setImmediate').mockClear();
          formatter('level', 'pollModuleMap: polling...');
          expect(setImmediate).toHaveBeenCalledTimes(1);
          setImmediate.mock.calls[0][0]();
          expect(moduleMapSpinner.start).toHaveBeenCalledTimes(1);
          expect(moduleMapSpinner.isEnabled).toBe(true);
        });

        it('skips writing the log statement', () => {
          expect(formatter('error', 'pollModuleMap: polling...')).toBe(null);
        });
      });

      describe('finishes with no updates', () => {
        it('finished the moduleMapSpinner with success', () => {
          moduleMapSpinner.succeed.mockClear();
          jest.spyOn(global, 'setImmediate').mockClear();
          formatter('level', 'pollModuleMap: no updates, looking again in 5s');
          expect(setImmediate).toHaveBeenCalledTimes(1);
          setImmediate.mock.calls[0][0]();
          expect(moduleMapSpinner.succeed).toHaveBeenCalledTimes(1);
          expect(moduleMapSpinner.succeed.mock.calls[0]).toMatchSnapshot();
          expect(moduleMapSpinner.isEnabled).toBe(false);
        });

        it('skips writing the log statement', () => {
          expect(formatter('error', 'pollModuleMap: no updates, looking again in 5s')).toBe(null);
        });
      });

      describe('finishes with updates', () => {
        it('finished the moduleMapSpinner with success', () => {
          moduleMapSpinner.succeed.mockClear();
          jest.spyOn(global, 'setImmediate').mockClear();
          formatter('level', 'pollModuleMap: 2 modules loaded/updated:', { a: '1.2.3', b: '4.5.6' });
          expect(setImmediate).toHaveBeenCalledTimes(1);
          setImmediate.mock.calls[0][0]();
          expect(moduleMapSpinner.succeed).toHaveBeenCalledTimes(1);
          expect(moduleMapSpinner.succeed.mock.calls[0]).toMatchSnapshot();
          expect(moduleMapSpinner.isEnabled).toBe(false);
        });

        it('writes a re-formatted log statement', () => {
          expect(formatter('error', 'pollModuleMap: 2 modules loaded/updated:', { a: '1.2.3', b: '4.5.6' })).toMatchSnapshot();
        });
      });

      describe('finishes with errors', () => {
        it('finished the moduleMapSpinner with success', () => {
          moduleMapSpinner.warn.mockClear();
          jest.spyOn(global, 'setImmediate').mockClear();
          formatter('level', 'pollModuleMap: error polling');
          expect(setImmediate).toHaveBeenCalledTimes(1);
          setImmediate.mock.calls[0][0]();
          expect(moduleMapSpinner.warn).toHaveBeenCalledTimes(1);
          expect(moduleMapSpinner.warn.mock.calls[0]).toMatchSnapshot();
          expect(moduleMapSpinner.isEnabled).toBe(false);
        });

        it('writes the log statement', () => {
          const err = new Error('sample test error');
          err.stack = 'sample test error\n<skipping for files>';
          const formattedError = formatter('error', 'pollModuleMap: error polling', err)
            .replace('[', '')
            .replace(']', '');
          expect(formattedError).toMatchSnapshot();
        });
      });
      describe('monitor', () => {
        it('skips writing the log statement for setting up the monitor', () => {
          expect(formatter('error', 'pollModuleMap: setting up polling monitor to run every 5s')).toBe(null);
        });
        it('skips writing the log statement for when the monitor runs', () => {
          expect(formatter('error', 'pollModuleMap: running polling monitor')).toBe(null);
        });
        it('skips writing the log statement for when polling is not considered stopped', () => {
          expect(
            formatter(
              'error',
              'pollModuleMap: polling is working as expected. Last poll: 5ms ago, Max poll: 6ms.'
            )
          ).toBe(null);
        });
        it('skips writing the log statement for when polling is considered stopped', () => {
          expect(
            formatter(
              'error',
              'pollModuleMap: polling has unexpectedly stopped. Last poll: 7ms ago, Max poll: 5ms.'
            )
          ).toBe(null);
        });
        it('skips writing the log statement for when polling has been restarted by the monitor', () => {
          expect(formatter('error', 'pollModuleMap: restarted polling')).toBe(null);
        });
      });
    });
  });
});
