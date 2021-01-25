import AggregateError from 'es-aggregate-error';
import validateEnvironment from '../../../../src/server/config/env/precheck';

const badNodeEnv = {
  NODE_ENV: 'test',
  moduleMap: null,
  rootModuleName: null,
};

const badDevEnv = {
  NODE_ENV: 'development',
  moduleMap: undefined,
  rootModuleName: undefined,
};

const goodDevEnv = {
  NODE_ENV: 'development',
  moduleMap: { a: 1 },
  rootModuleName: 'happy-module',
};
const badDevEnvWithModuleMapEmptyObject = {
  NODE_ENV: 'development',
  moduleMap: { },
  rootModuleName: 'happy-module',
};

const badDevEnvWithModuleMapUrl = {
  NODE_ENV: 'development',
  moduleMap: 'aexp.com',
  rootModuleName: 'happy-module',
};

const goodDevEnvWithModuleMapUrl = {
  NODE_ENV: 'development',
  moduleMap: 'https://asdf.com',
  rootModuleName: 'happy-module',
};


const badProdEnv = {
  NODE_ENV: 'production',
  HOLOCRON_MODULE_MAP_URL: undefined,
  ONE_CLIENT_REPORTING_URL: undefined,
  ONE_CLIENT_CSP_REPORTING_URL: undefined,
  ONE_CLIENT_ROOT_MODULE_NAME: undefined,
  ONE_CLIENT_CDN_URL: 'https://asdf.com',
  ONE_CONFIG_ENV: undefined,
  rootModuleNameDuplicate: true,
};

const goodProdEnv = {
  NODE_ENV: 'production',
  HOLOCRON_MODULE_MAP_URL: 'https://asdf.com',
  ONE_CLIENT_REPORTING_URL: 'https://asdf.com',
  ONE_CLIENT_CSP_REPORTING_URL: 'https://asdf.com',
  ONE_CLIENT_ROOT_MODULE_NAME: 'https://asdf.com',
  ONE_CLIENT_CDN_URL: 'https://asdf.com/',
  ONE_CONFIG_ENV: 'test',
  rootModuleNameDuplicate: false,
};


describe('precheck', () => {
  test('Only NODE_ENV error should be in error list if value not one of "development" or "production"', () => {
    expect(() => validateEnvironment(badNodeEnv)).toThrowError(new AggregateError([
      new Error('NODE_ENV environment variable must be either "development" or "production"; given: test'),

    ],
    'Please fix the following 1 errors'));
  });

  test('should show errors for bad dev parameters', () => {
    expect(() => validateEnvironment(badDevEnv)).toThrowError(new AggregateError([
    ],
    'Please fix the following 2 errors'));
  });

  test('should not throw when all required dev params defined', () => {
    expect(() => validateEnvironment(goodDevEnv)).not.toThrowError();
  });

  test('should not throw when all required dev params defined (moduleMap: <url>)', () => {
    expect(() => validateEnvironment(goodDevEnvWithModuleMapUrl)).not.toThrowError();
  });

  test('should throw with bad url', () => {
    expect(() => validateEnvironment(badDevEnvWithModuleMapUrl)).toThrowError();
  });

  test('should throw with empty object for module map', () => {
    expect(() => validateEnvironment(badDevEnvWithModuleMapEmptyObject)).toThrowError();
  });

  test('should show errors for bad prod parameters', () => {
    expect(() => validateEnvironment(badProdEnv)).toThrowError(new AggregateError([
    ],
    'Please fix the following 7 errors'));
  });

  test('should not throw when all required prod params defined', () => {
    expect(() => validateEnvironment(goodProdEnv)).not.toThrowError();
  });
});
