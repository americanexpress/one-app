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

import React from 'react';
import { preprocessEnvVar } from '@americanexpress/env-config-utils';
import { META_DATA_KEY } from '@americanexpress/one-app-bundler';
import onModuleLoad, {
  setModulesUsingExternals,
  getModulesUsingExternals,
  CONFIGURATION_KEY,
} from '../../../src/server/utils/onModuleLoad';
// This named export exists only on the mock
// eslint-disable-next-line import/named
import { setStateConfig, getClientStateConfig, getServerStateConfig } from '../../../src/server/utils/stateConfig';
import { setCorsOrigins } from '../../../src/server/middleware/conditionallyAllowCors';
import { extendRestrictedAttributesAllowList, validateSafeRequestRestrictedAttributes } from '../../../src/server/utils/safeRequest';
import { setConfigureRequestLog } from '../../../src/server/utils/logging/serverMiddleware';
import { setCreateSsrFetch } from '../../../src/server/utils/createSsrFetch';
import { getEventLoopDelayThreshold } from '../../../src/server/utils/createCircuitBreaker';

jest.mock('../../../src/server/utils/stateConfig', () => ({
  setStateConfig: jest.fn(),
  getClientStateConfig: jest.fn(),
  getServerStateConfig: jest.fn(() => ({ rootModuleName: 'root-module' })),
}));
jest.mock('@americanexpress/env-config-utils');
jest.mock('../../../src/server/utils/readJsonFile', () => () => ({ buildVersion: '4.43.0-0-38f0178d' }));
jest.mock('../../../src/server/middleware/conditionallyAllowCors', () => ({
  setCorsOrigins: jest.fn(),
}));
jest.mock('../../../src/server/utils/logging/serverMiddleware');
jest.mock('../../../src/server/utils/createSsrFetch');

jest.mock('../../../src/server/utils/safeRequest', () => ({
  extendRestrictedAttributesAllowList: jest.fn(),
  validateSafeRequestRestrictedAttributes: jest.fn(),
}));

const RootModule = () => <h1>Hello, world</h1>;
const csp = "default: 'none'";
describe('onModuleLoad', () => {
  const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => null);
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => null);

  beforeEach(() => {
    global.getTenantRootModule = () => RootModule;
    jest.resetAllMocks();
    getServerStateConfig.mockImplementation(() => ({
      rootModuleName: 'some-root',
    }));
    getClientStateConfig.mockImplementation(() => ({
      rootModuleName: 'some-root',
    }));
  });

  afterEach(() => {
    setModulesUsingExternals([]);
  });

  it('does not do anything if there is not an environment variable config', () => {
    expect(
      () => onModuleLoad({ module: { [META_DATA_KEY]: { version: '1.0.0' } } })
    ).not.toThrow();
    expect(preprocessEnvVar).not.toHaveBeenCalled();
  });

  it('does not throw when the one app version is compatible', () => {
    expect(
      () => onModuleLoad({
        module: {
          [CONFIGURATION_KEY]: {
            appCompatibility: '^4.41.0',
          },
          [META_DATA_KEY]: { version: '1.0.1' },
        },
        moduleName: 'some-module',
      })
    ).not.toThrow();
  });

  it('throws when the one app version is incompatible', () => {
    expect(
      () => onModuleLoad({
        module: {
          [CONFIGURATION_KEY]: {
            appCompatibility: '~4.41.0',
          },
          [META_DATA_KEY]: { version: '1.0.2' },
        },
        moduleName: 'some-module',
      })
    ).toThrowErrorMatchingSnapshot();
  });

  it('runs validateConfig if validateStateConfig is supplied with custom validate funcs', () => {
    const validateStateConfig = {
      fakeApiUrl: {
        client: {
          validate: jest.fn(),
        },
        server: {
          validate: jest.fn(),
        },
      },
    };
    onModuleLoad({
      module: {
        [CONFIGURATION_KEY]: {
          validateStateConfig,
        },
        [META_DATA_KEY]: { version: '1.0.3' },
      },
      moduleName: 'some-module',
    });
    expect(validateStateConfig.fakeApiUrl.client.validate).toHaveBeenCalled();
    expect(validateStateConfig.fakeApiUrl.server.validate).toHaveBeenCalled();
  });

  it('runs validateConfig if validateStateConfig supplies a key without validate funcs', () => {
    const validateStateConfig = {
      fakeApiUrl: {},
    };
    expect(() => onModuleLoad({
      module: {
        [CONFIGURATION_KEY]: {
          validateStateConfig,
        },
        [META_DATA_KEY]: { version: '1.0.4' },
      },
      moduleName: 'some-module',
    })).not.toThrow();
  });

  it('calls setStateConfig if provideStateConfig is supplied', () => {
    const provideStateConfig = {
      fakeApiUrl: {
        client: {
          qa: 'http://fake-client-url.example.com',
        },
        server: {
          qa: 'http://fake-server-url.example.com',
        },
      },
    };
    onModuleLoad({
      module: {
        [CONFIGURATION_KEY]: {
          provideStateConfig,
          csp,
        },
        [META_DATA_KEY]: { version: '1.0.5' },
      },
      moduleName: 'some-root',
    });
    expect(setStateConfig).toHaveBeenCalledWith(provideStateConfig);
  });

  it('does not throw if the root module provides the expected versions of required externals', () => {
    RootModule[CONFIGURATION_KEY] = {
      providedExternals: {
        'dep-a': { version: '2.1.0', module: () => 0 },
        'dep-b': { version: '5.8.6', module: () => 0 },
        'dep-c': { version: '3.0.10', module: () => 0 },
      },
    };
    const configuration = {
      requiredExternals: {
        'dep-a': '^2.0.0',
        'dep-b': '~5.8.0',
        'dep-c': '>1.0.0',
      },
    };
    expect(() => onModuleLoad({ module: { [CONFIGURATION_KEY]: configuration, [META_DATA_KEY]: { version: '1.0.7' } }, moduleName: 'my-awesome-module' })).not.toThrow();
  });

  it('warns if a module that isn\'t the root module attempts to provide externals', () => {
    const configuration = {
      providedExternals: {
        'dep-b': {
          version: '1.0.0',
          module: () => null,
        },
      },

    };
    onModuleLoad({ module: { [CONFIGURATION_KEY]: configuration, [META_DATA_KEY]: { version: '1.0.8' } }, moduleName: 'my-awesome-module' });
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
  });

  it('throws if the root module does not provide the expected external', () => {
    RootModule[CONFIGURATION_KEY] = {
      providedExternals: {
        'dep-a': { version: '2.1.0', module: () => 0 },
      },
    };
    const configuration = {
      requiredExternals: {
        'dep-b': '^2.0.0',
      },
    };
    expect(() => onModuleLoad({ module: { [CONFIGURATION_KEY]: configuration, [META_DATA_KEY]: { version: '1.0.9' } }, moduleName: 'my-awesome-module' })).toThrowErrorMatchingSnapshot();
  });

  it('throws if the root module provides an incompatible version of a required external', () => {
    RootModule[CONFIGURATION_KEY].providedExternals = {
      'dep-a': { version: '2.1.0', module: () => 0 },
    };
    const configuration = {
      requiredExternals: {
        'dep-a': '^2.1.1',
      },
    };
    expect(() => onModuleLoad({ module: { [CONFIGURATION_KEY]: configuration, [META_DATA_KEY]: { version: '1.0.10' } }, moduleName: 'my-awesome-module' })).toThrowErrorMatchingSnapshot();
  });

  it('includes messages about all missing or incompatible externals', () => {
    RootModule[CONFIGURATION_KEY] = {
      providedExternals: {
        'dep-a': { version: '3.2.0', module: () => 0 },
        'dep-b': { version: '5.9.6', module: () => 0 },
        'dep-c': { version: '3.0.10', module: () => 0 },
      },
    };
    const configuration = {
      requiredExternals: {
        'dep-a': '^2.0.0',
        'dep-b': '~5.8.0',
        'dep-c': '>1.0.0',
        'dep-d': '^3.1.2',
      },
    };
    expect(() => onModuleLoad({ module: { [CONFIGURATION_KEY]: configuration, [META_DATA_KEY]: { version: '1.0.11' } }, moduleName: 'my-awesome-module' })).toThrowErrorMatchingSnapshot();
  });

  it('keeps track of the externals a module is using', () => {
    RootModule[CONFIGURATION_KEY] = {
      providedExternals: {
        'dep-a': { version: '2.1.0', module: () => 0 },
        'dep-b': { version: '5.8.6', module: () => 0 },
        'dep-c': { version: '3.0.10', module: () => 0 },
      },
    };
    const configuration = {
      requiredExternals: {
        'dep-a': '^2.0.0',
        'dep-b': '~5.8.0',
      },
    };
    expect(getModulesUsingExternals()).toEqual([]);
    onModuleLoad({ module: { [CONFIGURATION_KEY]: configuration, [META_DATA_KEY]: { version: '1.0.12' } }, moduleName: 'my-awesome-module' });
    expect(getModulesUsingExternals()).toEqual(['my-awesome-module']);
  });

  it('clears the modules using externals when loading the root module', () => {
    const modulesUsingExternals = ['a', 'b', 'c'];
    setModulesUsingExternals(modulesUsingExternals);
    expect(getModulesUsingExternals()).toEqual(modulesUsingExternals);
    onModuleLoad({ module: { [CONFIGURATION_KEY]: { csp }, [META_DATA_KEY]: { version: '1.0.13' } }, moduleName: 'some-root' });
    expect(getModulesUsingExternals()).toEqual([]);
  });

  it('validates csp added to the root module', () => {
    const callOnModuleLoad = () => (onModuleLoad({
      module: {},
      moduleName: 'some-root',
    }));

    expect(callOnModuleLoad).toThrowErrorMatchingSnapshot();
  });

  it('updates createSsrFetch when added on the root module', () => {
    const fakeCreateSsrFetch = jest.fn();
    onModuleLoad({
      module: {
        [CONFIGURATION_KEY]: {
          csp,
          createSsrFetch: fakeCreateSsrFetch,
        },
        [META_DATA_KEY]: { version: '1.0.14' },
      },
      moduleName: 'some-root',
    });

    expect(setCreateSsrFetch).toHaveBeenCalledWith(fakeCreateSsrFetch);
  });

  it('sets CORS origins from the root module', () => {
    const corsOrigins = ['example.com'];
    onModuleLoad({
      module: {
        [CONFIGURATION_KEY]: {
          csp,
          corsOrigins,
        },
        [META_DATA_KEY]: { version: '1.0.14' },
      },
      moduleName: 'some-root',
    });
    expect(setCorsOrigins).toHaveBeenCalledWith(corsOrigins);
  });

  it('sets the event loop lag threshold from the root module', () => {
    const eventLoopDelayThreshold = 50;
    expect(getEventLoopDelayThreshold()).not.toBe(eventLoopDelayThreshold);
    onModuleLoad({
      module: {
        [CONFIGURATION_KEY]: {
          csp,
          eventLoopDelayThreshold,
        },
        [META_DATA_KEY]: { version: '1.0.14' },
      },
      moduleName: 'some-root',
    });
    expect(getEventLoopDelayThreshold()).toBe(eventLoopDelayThreshold);
  });

  it('logs when the root module is loaded', () => {
    onModuleLoad({
      module: { [CONFIGURATION_KEY]: { csp }, [META_DATA_KEY]: { version: '1.0.15' } },
      moduleName: 'some-root',
    });
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    expect(consoleInfoSpy).toHaveBeenCalledWith('Loaded module some-root@1.0.15');
  });

  it('logs when other modules are loaded', () => {
    onModuleLoad({
      module: { [META_DATA_KEY]: { version: '1.0.16' } },
      moduleName: 'not-the-root-module',
    });
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    expect(consoleInfoSpy).toHaveBeenCalledWith('Loaded module not-the-root-module@1.0.16');
  });

  it('updates allowed safeRequest values from the root module', () => {
    onModuleLoad({
      module: {
        [CONFIGURATION_KEY]: {
          extendSafeRequestRestrictedAttributes: { cookies: ['some-cookie'] },
          csp,
        },
        [META_DATA_KEY]: { version: '1.0.5' },
      },
      moduleName: 'some-root',
    });
    expect(extendRestrictedAttributesAllowList).toHaveBeenCalledWith({
      cookies: ['some-cookie'],
    });
  });

  it('validates safeRequest allow list', () => {
    onModuleLoad({
      module: {
        [CONFIGURATION_KEY]: {
          requiredSafeRequestRestrictedAttributes: { cookies: ['some-cookie'] },
        },
        [META_DATA_KEY]: { version: '1.0.5' },
      },
      moduleName: 'random-root',
    });

    expect(validateSafeRequestRestrictedAttributes).toHaveBeenCalledWith({
      cookies: ['some-cookie'],
    });
  });

  it('sets configureRequestLog when given on the root module', () => {
    const configureRequestLog = jest.fn();
    onModuleLoad({
      module: {
        [CONFIGURATION_KEY]: {
          csp,
          configureRequestLog,
        },
        [META_DATA_KEY]: { version: '1.0.14' },
      },
      moduleName: 'some-root',
    });

    expect(setConfigureRequestLog).toHaveBeenCalledWith(configureRequestLog);
  });
});
