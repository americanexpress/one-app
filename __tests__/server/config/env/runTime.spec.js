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

expect.extend({
  toValidateURL(input) {
    let passNegativeCase;
    let passPositiveCase;
    try {
      input('//example.com/path');
      input('/path');
      passNegativeCase = false;
    } catch (e) {
      passNegativeCase = true;
    }
    try {
      input('https://example.com/path');
      passPositiveCase = true;
    } catch (e) {
      passPositiveCase = false;
    }
    return {
      pass: passNegativeCase && passPositiveCase,
      message: () => `${this.utils.matcherHint('toValidateURL', undefined, '')
      }\n\nExpected function to validate input is a fetchable URL in Node`,
    };
  },
  toValidatePositiveInteger(input) {
    let passNegativeCase;
    let passPositiveCase;
    try {
      input('string that evaluates to NaN');
      input('0');
      input('-6');
      input('4.3');
      passNegativeCase = false;
    } catch (e) {
      passNegativeCase = true;
    }
    try {
      input('1');
      input('3001');
      input(undefined);
      passPositiveCase = true;
    } catch (e) {
      passPositiveCase = false;
    }
    return {
      pass: passNegativeCase && passPositiveCase,
      message: () => `${this.utils.matcherHint('toValidatePositiveInteger', undefined, '')
      }\n\nExpected function to validate input is a positive integer`,
    };
  },
});

jest.mock('ip', () => ({
  address: () => 'localhost',
}));

jest.mock('yargs', () => ({ argv: { rootModuleName: 'my-module' } }));

jest.mock('@americanexpress/env-config-utils', () => {
  const actualRuntimeConfigUtils = jest.requireActual('@americanexpress/env-config-utils');
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
    'ONE_DANGEROUSLY_DISABLE_CSP',
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
    'ONE_ENABLE_POST_TO_MODULE_ROUTES',
    'ONE_MAX_POST_REQUEST_PAYLOAD',
    'ONE_CONFIG_USE_NATIVE_POLYFILL',
  ].forEach((name) => {
    origEnvVarVals[name] = process.env[name];
  });

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
    resetEnvVar('ONE_DANGEROUSLY_DISABLE_CSP', 'false');
    resetEnvVar('HTTP_ONE_APP_DEV_CDN_PORT');
    resetEnvVar('ONE_ENABLE_POST_TO_MODULE_ROUTES');
    jest.resetModules();
    jest.resetAllMocks();
  });

  afterAll(() => {
    // eslint-disable-next-line no-console
    console.info = origConsoleInfo;
    console.warn = origConsoleWarn;
    Object.keys(origEnvVarVals).forEach((name) => resetEnvVar(name, origEnvVarVals[name]));
    jest.resetAllMocks();
  });

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

  describe('ONE_DANGEROUSLY_DISABLE_CSP', () => {
    const disableCspEnv = getEnvVarConfig('ONE_DANGEROUSLY_DISABLE_CSP');

    it('throws error if ONE_DANGEROUSLY_DISABLE_CSP is set to true and NODE_ENV is not development', () => {
      expect(() => disableCspEnv.validate('true')).toThrowError(
        'If you are trying to bypass CSP requirement, NODE_ENV must also be set to development.'
      );
    });

    it('warns console if both ONE_DANGEROUSLY_DISABLE_CSP and NODE_ENV are set properly', () => {
      process.env.NODE_ENV = 'development';
      disableCspEnv.validate('true');
      expect(console.warn).toHaveBeenCalledWith(
        'ONE_DANGEROUSLY_DISABLE_CSP is true and NODE_ENV is set to development. Content-Security-Policy header will not be set.'
      );
    });

    it('does not warn or throw if ONE_DANGEROUSLY_DISABLE_CSP is set to false', () => {
      expect(() => disableCspEnv.validate('false')).not.toThrow();
    });

    it('parses input and returns it in lowercase', () => {
      expect(disableCspEnv.normalize('TRUE')).toBe('true');
    });

    it('has a default value', () => {
      expect(disableCspEnv.defaultValue).toBe('false');
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
      expect(() => devCdnPort.normalize('0002345a')).toThrowErrorMatchingInlineSnapshot(
        '"env var HTTP_ONE_APP_DEV_CDN_PORT needs to be a valid integer, given "0002345a""'
      );
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
      expect(() => devProxyPort.normalize('r00t')).toThrowErrorMatchingInlineSnapshot(
        '"env var HTTP_ONE_APP_DEV_PROXY_SERVER_PORT needs to be a valid integer, given "r00t""'
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
      expect(holocronModuleMapPath.defaultValue()).toBe(
        'http://localhost:3001/static/module-map.json'
      );
    });

    it('has no default value for production', () => {
      process.env.NODE_ENV = 'production';
      expect(holocronModuleMapPath.defaultValue()).not.toBeDefined();
    });

    it('ensures node can reach the URL', () => {
      expect(holocronModuleMapPath.validate).toValidateURL();
    });

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

    it('validates the value as a positive integer', () => {
      expect(holocronServerMaxModulesRetry.validate).toValidatePositiveInteger();
    });
  });

  describe('HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH', () => {
    const holocronServerMaxSimModulesFetch = getEnvVarConfig(
      'HOLOCRON_SERVER_MAX_SIM_MODULES_FETCH'
    );

    it('does not have a default value', () => {
      expect(holocronServerMaxSimModulesFetch.defaultValue).toBe(undefined);
    });

    it('validates the value as a positive integer', () => {
      expect(holocronServerMaxSimModulesFetch.validate).toValidatePositiveInteger();
    });
  });

  describe('ONE_CLIENT_REPORTING_URL', () => {
    const clientReportingUrl = getEnvVarConfig('ONE_CLIENT_REPORTING_URL');

    it('has a default value for development', () => {
      process.env.NODE_ENV = 'development';
      expect(clientReportingUrl.defaultValue()).toBe('/_/report/errors');
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
      expect(clientCSPReportingUrl.defaultValue()).toBe('/_/report/security/csp-violation');
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
      expect(() => clientRootModuleName.validate()).toThrowErrorMatchingInlineSnapshot(
        '"The `ONE_CLIENT_ROOT_MODULE_NAME` environment variable must be defined."'
      );
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
      expect(referrerPolicyOverride.defaultValue()).toEqual('');
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

  describe('ONE_ENABLE_POST_TO_MODULE_ROUTES', () => {
    const enablePostToModuleRoutes = getEnvVarConfig('ONE_ENABLE_POST_TO_MODULE_ROUTES');

    it('should have a default value of "false"', () => {
      expect(enablePostToModuleRoutes.defaultValue).toBe('false');
    });

    it('should normalize the value to be either true or false', () => {
      expect(enablePostToModuleRoutes.normalize('Value')).toBe('true');
      expect(enablePostToModuleRoutes.normalize('VALUE')).toBe('true');
      expect(enablePostToModuleRoutes.normalize('true')).toBe('true');
      expect(enablePostToModuleRoutes.normalize('FALSE')).toBe('false');
    });

    it('should pass validation when value is "true" or "false"', () => {
      expect(() => enablePostToModuleRoutes.validate('true')).not.toThrow();
      expect(() => enablePostToModuleRoutes.validate('false')).not.toThrow();
    });

    it('should fail validation when value is not "true" or "false"', () => {
      expect(() => enablePostToModuleRoutes.validate('bad value')
      ).toThrowErrorMatchingInlineSnapshot('"Expected "bad value" to be "true" or "false""');
    });
  });

  describe('ONE_MAX_POST_REQUEST_PAYLOAD', () => {
    const postRequestMaxPayload = getEnvVarConfig('ONE_MAX_POST_REQUEST_PAYLOAD');

    it('should have a default value of "15kb"', () => {
      expect(postRequestMaxPayload.defaultValue).toBe('15kb');
    });

    it('should fail validation when input is not parseable by bytes util', () => {
      process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES = true;
      expect(() => postRequestMaxPayload.validate('bad value')).toThrowErrorMatchingInlineSnapshot(
        '"Expected "bad value" to be parseable by bytes utility https://www.npmjs.com/package/bytes"'
      );
    });

    it('should pass validation when input is parseable by bytes util', () => {
      process.env.ONE_ENABLE_POST_TO_MODULE_ROUTES = true;
      expect(() => postRequestMaxPayload.validate('20kb')).not.toThrow();
    });
  });

  describe('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT', () => {
    const otelLogCollectorUrl = getEnvVarConfig('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT');

    it('ensures node can reach the URL', () => {
      expect(otelLogCollectorUrl.validate).toValidateURL();
    });

    it('is not required', () => {
      expect(() => otelLogCollectorUrl.validate()).not.toThrow();
    });
  });

  describe('OTEL_SERVICE_NAME', () => {
    const otelServiceName = getEnvVarConfig('OTEL_SERVICE_NAME');

    it('should have a default value of "One App"', () => {
      expect(otelServiceName.defaultValue).toBe('One App');
    });
  });

  describe('ONE_CONFIG_USE_NATIVE_POLYFILL', () => {
    const useNativePolyfill = getEnvVarConfig('ONE_CONFIG_USE_NATIVE_POLYFILL');

    it('should have a default value of false', () => {
      expect(useNativePolyfill.defaultValue).toBe('false');
    });

    it('should normalise the value to false when not explicitly true', () => {
      expect(useNativePolyfill.normalize('Value')).toBe('false');
      expect(useNativePolyfill.normalize('VALUE')).toBe('false');
      expect(useNativePolyfill.normalize('true')).toBe('true');
      expect(useNativePolyfill.normalize('TRUE')).toBe('true');
      expect(useNativePolyfill.normalize('FALSE')).toBe('false');
    });
  });
});
