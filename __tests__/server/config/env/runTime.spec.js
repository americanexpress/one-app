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

jest.mock('ip', () => ({
  address: () => 'localhost',
}));

jest.mock('yargs', () => ({ argv: { rootModuleName: 'my-module' } }));

jest.mock('@americanexpress/env-config-utils', () => {
  const actualRuntimeConfigUtils = require.requireActual('@americanexpress/env-config-utils');
  actualRuntimeConfigUtils.preprocessEnvVar = jest.fn();

  return actualRuntimeConfigUtils;
});

describe('runTime', () => {
  // eslint-disable-next-line no-console
  const origConsoleInfo = console.info;
  const origConsoleWarn = console.warn;
  const origEnvVarVals = {};
  [
    'NODE_ENV',
    'NODE_HEAPDUMP_OPTIONS',
    'HTTP_PORT',
    'HTTP_METRICS_PORT',
    'HOLOCRON_MODULE_MAP_URL',
    'HTTP_ONE_APP_DEV_CDN_PORT',
    'HTTP_ONE_APP_DEV_PROXY_SERVER_PORT',
    'HOLOCRON_SERVER_MAX_MODULES_RETRY',
    'HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH',
    'ONE_CLIENT_REPORTING_URL',
    'ONE_CLIENT_CSP_REPORTING_URL',
    'ONE_CLIENT_CDN_URL',
    'ONE_CLIENT_LOCALE_FILENAME',
    'ONE_CLIENT_ROOT_MODULE_NAME',
  ]
    .forEach((name) => { origEnvVarVals[name] = process.env[name]; });

  function getEnvVarConfig(envVarName) {
    const runTime = require('../../../../src/server/config/env/runTime').default;
    return runTime.filter(({ name }) => name === envVarName)[0];
  }

  function resetEnvVar(name, val) {
    if (val === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = val;
    }
  }

  beforeEach(() => {
    // eslint-disable-next-line no-console
    console.info = jest.fn();
    console.warn = jest.fn();
    resetEnvVar('NODE_ENV');
    resetEnvVar('HTTP_ONE_APP_DEV_CDN_PORT');
    jest.resetModules();
    jest.resetAllMocks();
  });

  afterAll(() => {
    // eslint-disable-next-line no-console
    console.info = origConsoleInfo;
    console.warn = origConsoleWarn;
    Object
      .keys(origEnvVarVals)
      .forEach((name) => resetEnvVar(name, origEnvVarVals[name]));
    jest.resetAllMocks();
  });

  function nodeUrl(entry) {
    return () => {
      expect(() => entry.validate('https://example.com/path')).not.toThrow();
      expect(() => entry.validate('/path')).toThrow();
    };
  }

  function positiveInteger(entry) {
    return () => {
      expect(() => entry.validate('1')).not.toThrow();
      expect(() => entry.validate('3001')).not.toThrow();
      expect(() => entry.validate(undefined)).not.toThrow();
      expect(() => entry.validate('string that evaluates to NaN')).toThrow();
      expect(() => entry.validate('0')).toThrow();
      expect(() => entry.validate('-6')).toThrow();
      expect(() => entry.validate('4.3')).toThrow();
    };
  }

  it('has a name on every entry', () => {
    const runTime = require('../../../../src/server/config/env/runTime').default;
    runTime.forEach((entry) => {
      expect(typeof entry.name).toBeTruthy();
      expect(typeof entry.name).toEqual('string');
    });
  });

  describe('NODE_ENV', () => {
    const nodeEnv = getEnvVarConfig('NODE_ENV');

    it('normalizes value to be all lowercase', () => {
      expect(nodeEnv.normalize('PRODUCtION')).toBe('production');
    });

    it('sets value to production by default', () => {
      expect(nodeEnv.defaultValue).toBe('production');
    });

    it('only allows for values to be set to either development or production', () => {
      expect(nodeEnv.valid).toMatchSnapshot();
    });
  });

  describe('NODE_HEAPDUMP_OPTIONS', () => {
    const heapdumpOptions = getEnvVarConfig('NODE_HEAPDUMP_OPTIONS');

    it('defaults to config of not writing default heapdumps', () => {
      expect(heapdumpOptions.defaultValue).toBe('nosignal');
    });
  });

  describe('HTTP_PORT', () => {
    const httpPort = getEnvVarConfig('HTTP_PORT');

    it('normalizes numeric input', () => {
      expect(httpPort.normalize('1337')).toEqual(1337);
      expect(() => httpPort.normalize('r00t')).toThrowError(
        'env var HTTP_PORT needs to be a valid integer, given "r00t"'
      );
      expect(httpPort.normalize('0002345')).toEqual(2345);
      expect(() => httpPort.normalize('0002345a')).toThrow();
    });

    it('has a default value', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.HTTP_PORT;
      expect(httpPort.defaultValue()).toBeDefined();
      expect(httpPort.defaultValue()).toBe(3000);
    });

    it('uses the value of the `PORT` env var as a default if defined', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.HTTP_PORT;
      process.env.PORT = 5000;
      expect(httpPort.defaultValue()).toBeDefined();
      expect(httpPort.defaultValue()).toBe('5000');
    });
  });

  describe('HTTP_ONE_APP_DEV_CDN_PORT', () => {
    const devCdnPort = getEnvVarConfig('HTTP_ONE_APP_DEV_CDN_PORT');

    it('normalizes numeric input', () => {
      expect(devCdnPort.normalize('1337')).toEqual(1337);
      expect(() => devCdnPort.normalize('r00t')).toThrowError(
        'env var HTTP_ONE_APP_DEV_CDN_PORT needs to be a valid integer, given "r00t"'
      );
      expect(devCdnPort.normalize('0002345')).toEqual(2345);
      expect(() => devCdnPort.normalize('0002345a')).toThrowErrorMatchingSnapshot();
    });

    it('does not normalize if no value is given', () => {
      expect(devCdnPort.normalize()).toEqual(undefined);
    });

    it('has a default value for development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.HTTP_ONE_APP_DEV_CDN_PORT;
      expect(devCdnPort.defaultValue()).toBeDefined();
      expect(devCdnPort.defaultValue()).toBe(3001);
    });

    it('has no default value for production', () => {
      process.env.NODE_ENV = 'production';
      expect(devCdnPort.defaultValue()).not.toBeDefined();
    });
  });

  describe('HTTP_ONE_APP_DEV_PROXY_SERVER_PORT', () => {
    const devProxyPort = getEnvVarConfig('HTTP_ONE_APP_DEV_PROXY_SERVER_PORT');

    it('normalizes numeric input', () => {
      expect(devProxyPort.normalize('1337')).toEqual(1337);
      expect(() => devProxyPort.normalize('r00t')).toThrowErrorMatchingSnapshot(
        'env var HTTP_ONE_APP_DEV_PROXY_SERVER_PORT needs to be a valid integer, given "r00t"'
      );
      expect(devProxyPort.normalize('0002345')).toEqual(2345);
      expect(() => devProxyPort.normalize('0002345a')).toThrow();
    });

    it('does not normalize if no value is given', () => {
      expect(devProxyPort.normalize()).toEqual(undefined);
    });

    it('has a default value for development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.HTTP_ONE_APP_DEV_CDN_PORT;
      expect(devProxyPort.defaultValue()).toBeDefined();
      expect(devProxyPort.defaultValue()).toBe(3002);
    });

    it('has no default value for production', () => {
      process.env.NODE_ENV = 'production';
      expect(devProxyPort.defaultValue()).not.toBeDefined();
    });
  });

  describe('HTTP_METRICS_PORT', () => {
    const httpPort = getEnvVarConfig('HTTP_METRICS_PORT');

    it('normalizes numeric input', () => {
      expect(httpPort.normalize('1337')).toEqual(1337);
      expect(() => httpPort.normalize('r00t')).toThrowError(
        'env var HTTP_METRICS_PORT needs to be a valid integer, given "r00t"'
      );
      expect(httpPort.normalize('0002345')).toEqual(2345);
      expect(() => httpPort.normalize('0002345a')).toThrow();
    });

    it('has a default value of 3005', () => {
      expect(httpPort.defaultValue()).toBe(3005);
    });
  });

  describe('HOLOCRON_MODULE_MAP_URL', () => {
    const holocronModuleMapPath = getEnvVarConfig('HOLOCRON_MODULE_MAP_URL');

    it('has a default value for development', () => {
      process.env.NODE_ENV = 'development';
      process.env.HTTP_ONE_APP_DEV_CDN_PORT = 3001;
      expect(holocronModuleMapPath.defaultValue()).toBeDefined();
      expect(holocronModuleMapPath.defaultValue()).toBe('http://localhost:3001/static/module-map.json');
    });

    it('has no default value for production', () => {
      process.env.NODE_ENV = 'production';
      expect(holocronModuleMapPath.defaultValue()).not.toBeDefined();
    });

    it('ensures node can reach the URL', nodeUrl(holocronModuleMapPath));

    it('should use port numbers specified via HTTP_ONE_APP_DEV_CDN_PORT', () => {
      process.env.NODE_ENV = 'development';
      process.env.HTTP_ONE_APP_DEV_CDN_PORT = 1337;
      const regEx = /\d*(?=\/static)/;
      expect(holocronModuleMapPath.defaultValue()).toBeDefined();
      expect(regEx.exec(holocronModuleMapPath.defaultValue())[0]).toBe('1337');
    });
  });

  describe('HOLOCRON_SERVER_MAX_MODULES_RETRY', () => {
    const holocronServerMaxModulesRetry = getEnvVarConfig('HOLOCRON_SERVER_MAX_MODULES_RETRY');

    it('does not have a default value', () => {
      expect(holocronServerMaxModulesRetry.defaultValue).toBe(undefined);
    });

    it('validates the value as a positive integer', positiveInteger(holocronServerMaxModulesRetry));
  });

  describe('HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH', () => {
    const holocronServerMaxSimModulesFetch = getEnvVarConfig('HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH');

    it('does not have a default value', () => {
      expect(holocronServerMaxSimModulesFetch.defaultValue).toBe(undefined);
    });

    it('validates the value as a positive integer', positiveInteger(holocronServerMaxSimModulesFetch));
  });

  describe('ONE_CLIENT_REPORTING_URL', () => {
    const clientReportingUrl = getEnvVarConfig('ONE_CLIENT_REPORTING_URL');

    it('has a default value for development', () => {
      process.env.NODE_ENV = 'development';
      expect(clientReportingUrl.defaultValue()).toBeDefined();
      expect(clientReportingUrl.defaultValue()).toMatch(/^https?:\/\//);
    });

    it('has no default value for production', () => {
      process.env.NODE_ENV = 'production';
      expect(clientReportingUrl.defaultValue()).not.toBeDefined();
    });
  });

  describe('ONE_CLIENT_CSP_REPORTING_URL', () => {
    const clientCSPReportingUrl = getEnvVarConfig('ONE_CLIENT_CSP_REPORTING_URL');

    it('has a default value for development', () => {
      process.env.NODE_ENV = 'development';
      expect(clientCSPReportingUrl.defaultValue()).toBeDefined();
      expect(clientCSPReportingUrl.defaultValue()).toMatch(/^https?:\/\//);
    });

    it('has no default value for production', () => {
      process.env.NODE_ENV = 'production';
      expect(clientCSPReportingUrl.defaultValue()).not.toBeDefined();
    });
  });

  describe('ONE_CLIENT_CDN_URL', () => {
    const clientCdnUrl = getEnvVarConfig('ONE_CLIENT_CDN_URL');

    it('defaults to the app server in development', () => {
      process.env.NODE_ENV = 'development';
      const defaultValue = clientCdnUrl.defaultValue();
      expect(defaultValue).toBeTruthy();
      expect(typeof defaultValue).toEqual('string');
      expect(defaultValue.startsWith('/')).toBe(true);
    });

    it('has no default value for production', () => {
      process.env.NODE_ENV = 'production';
      expect(clientCdnUrl.defaultValue()).toBeUndefined();
    });

    it('validates the value as a web URL', () => {
      expect(() => clientCdnUrl.validate('https://example.com/path/')).not.toThrow();
      expect(() => clientCdnUrl.validate('/path/')).not.toThrow();
      expect(() => clientCdnUrl.validate('git+ssh://asdf.com/qwerty/')).toThrow();
    });

    it('validates the value has a trailing slash', () => {
      expect(() => clientCdnUrl.validate('/path/')).not.toThrow();
      expect(() => clientCdnUrl.validate('/path')).toThrow();
    });
  });

  describe('ONE_CLIENT_LOCALE_FILENAME', () => {
    const clientLocaleFilename = getEnvVarConfig('ONE_CLIENT_LOCALE_FILENAME');

    it('normalizes truthy values to themselves', () => {
      expect(clientLocaleFilename.normalize('qa')).toEqual('qa');
      expect(clientLocaleFilename.normalize('integration')).toEqual('integration');
    });

    it('normalizes falsey values to undefined', () => {
      expect(clientLocaleFilename.normalize('')).toEqual(undefined);
      expect(clientLocaleFilename.normalize(false)).toEqual(undefined);
      expect(clientLocaleFilename.normalize(null)).toEqual(undefined);
      expect(clientLocaleFilename.normalize(0)).toEqual(undefined);
    });

    it('uses default value in development', () => {
      process.env.NODE_ENV = 'development';
      expect(clientLocaleFilename.defaultValue()).toEqual('integration');
    });

    it('uses default value in production', () => {
      process.env.NODE_ENV = 'production';
      expect(clientLocaleFilename.defaultValue()).toEqual(undefined);
    });
  });

  describe('ONE_CLIENT_ROOT_MODULE_NAME', () => {
    const clientRootModuleName = getEnvVarConfig('ONE_CLIENT_ROOT_MODULE_NAME');

    it('validates that environment value is defined', () => {
      expect(() => clientRootModuleName.validate()).toThrowErrorMatchingSnapshot();
      expect(() => clientRootModuleName.validate('frank-lloyd-root')).not.toThrow();
    });

    it('has a default value for development', () => {
      process.env.NODE_ENV = 'development';
      expect(clientRootModuleName.defaultValue()).toBe('my-module');
    });

    it('has no default value for production', () => {
      process.env.NODE_ENV = 'production';
      expect(clientRootModuleName.defaultValue()).not.toBeDefined();
    });
  });

  describe('ONE_REFERRER_POLICY_OVERRIDE', () => {
    const referrerPolicyOverride = getEnvVarConfig('ONE_REFERRER_POLICY_OVERRIDE');

    it('default value', () => {
      expect(referrerPolicyOverride.defaultValue()).toEqual('same-origin');
    });

    it('validates approved policy', () => {
      expect(() => referrerPolicyOverride.validate('strict-origin')).not.toThrow();
      expect(() => referrerPolicyOverride.validate('unsafe-url')).toThrow();
    });
  });

  describe('ONE_SERVICE_WORKER', () => {
    const oneServiceWorkerFeatureFlag = getEnvVarConfig('ONE_SERVICE_WORKER');

    it('default value and normalize both return `false`', () => {
      expect(oneServiceWorkerFeatureFlag.defaultValue()).toEqual(false);
      expect(oneServiceWorkerFeatureFlag.normalize()).toEqual(false);
    });

    it('normalizes feature flag value based on string input', () => {
      expect(oneServiceWorkerFeatureFlag.normalize('false')).toEqual(false);
      expect(oneServiceWorkerFeatureFlag.normalize('truth')).toEqual(false);
      expect(oneServiceWorkerFeatureFlag.normalize('true')).toEqual(true);
    });
  });
});
