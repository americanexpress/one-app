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

import semver from 'semver';
import { Set as ImmutableSet } from 'immutable';
import { META_DATA_KEY } from '@americanexpress/one-app-bundler';
import { setStateConfig, getClientStateConfig, getServerStateConfig } from './stateConfig';
import { setCorsOrigins } from '../middleware/conditionallyAllowCors';
import readJsonFile from './readJsonFile';
import { extendRestrictedAttributesAllowList, validateSafeRequestRestrictedAttributes } from './safeRequest';
import { setConfigureRequestLog } from './logging/serverMiddleware';
import { setCreateSsrFetch } from './createSsrFetch';
import { setEventLoopDelayThreshold } from './createCircuitBreaker';
import { configurePWA } from '../middleware/pwa';

// Trim build hash
const { buildVersion } = readJsonFile('../../../.build-meta.json');
const appVersion = buildVersion.slice(0, -9);
let modulesUsingExternals = new ImmutableSet();

const registerModuleUsingExternals = (moduleName) => {
  modulesUsingExternals = modulesUsingExternals.add(moduleName);
};

const clearModulesUsingExternals = () => {
  modulesUsingExternals = modulesUsingExternals.clear();
};

export const getModulesUsingExternals = () => modulesUsingExternals.toJS();

export const setModulesUsingExternals = (moduleNames) => {
  modulesUsingExternals = new ImmutableSet(moduleNames);
};

const logModuleLoad = (moduleName, moduleVersion) => {
  console.info(`Loaded module ${moduleName}@${moduleVersion}`);
};

function validateConfig(configValidators, config) {
  Object.entries(configValidators)
    .forEach(([configKey, {
      client: { validate: validateClient = () => 0 } = {},
      server: { validate: validateServer = () => 0 } = {},
    }]) => {
      validateClient(config.client[configKey]);
      validateServer(config.server[configKey]);
    });
}

export const CONFIGURATION_KEY = 'appConfig';

export default function onModuleLoad({
  module,
  moduleName,
}) {
  const {
    [CONFIGURATION_KEY]: {
      // Root Module Specific
      providedExternals,
      provideStateConfig,
      csp,
      corsOrigins,
      configureRequestLog,
      extendSafeRequestRestrictedAttributes = {},
      createSsrFetch,
      eventLoopDelayThreshold,
      pwa,
      // Child Module Specific
      requiredExternals,
      validateStateConfig,
      requiredSafeRequestRestrictedAttributes = {},
      // Any Module
      appCompatibility,
    } = {},
    [META_DATA_KEY]: metaData,
  } = module;

  if (appCompatibility) {
    if (!semver.satisfies(appVersion, appCompatibility, { includePrerelease: true })) {
      throw new Error(`${moduleName}@${metaData.version} is not compatible with this version of one-app (${appVersion}), it requires ${appCompatibility}.`);
    }
  }

  const serverStateConfig = getServerStateConfig();
  const clientStateConfig = getClientStateConfig();

  if (validateStateConfig) {
    validateConfig(validateStateConfig, {
      server: serverStateConfig,
      client: clientStateConfig,
    });
  }

  if (moduleName === serverStateConfig.rootModuleName) {
    if (!csp) {
      throw new Error('Root module must provide a valid content security policy');
    }
    clearModulesUsingExternals();
    if (provideStateConfig) {
      setStateConfig(provideStateConfig);
    }
    setCorsOrigins(corsOrigins);
    extendRestrictedAttributesAllowList(extendSafeRequestRestrictedAttributes);
    setConfigureRequestLog(configureRequestLog);
    setCreateSsrFetch(createSsrFetch);
    setEventLoopDelayThreshold(eventLoopDelayThreshold);
    logModuleLoad(moduleName, metaData.version);
    configurePWA(pwa);
    return;
  }

  if (providedExternals) {
    console.warn(
      `Module ${moduleName} attempted to provide externals. Only the root module can provide externals.`
    );
  }

  if (requiredExternals) {
    const messages = [];
    const RootModule = global.getTenantRootModule();

    Object.entries(requiredExternals).forEach(([externalName, requestedExternalVersion]) => {
      const providedExternal = RootModule[CONFIGURATION_KEY].providedExternals[externalName];

      if (!providedExternal) {
        messages.push(`External '${externalName}' is required by ${moduleName}, but is not provided by the root module`);
      } else if (!semver.satisfies(providedExternal.version, requestedExternalVersion)) {
        messages.push(`${externalName}@${requestedExternalVersion} is required by ${moduleName}, but the root module provides ${providedExternal.version}`);
      }
    });

    if (messages.length !== 0) {
      throw new Error(messages.join('\n'));
    }

    registerModuleUsingExternals(moduleName);
  }

  validateSafeRequestRestrictedAttributes(requiredSafeRequestRestrictedAttributes);

  logModuleLoad(moduleName, metaData.version);
}
