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
import { validateExternal, addRequiredExternal } from 'holocron';
import { setStateConfig, getClientStateConfig, getServerStateConfig } from './stateConfig';
import { setCorsOrigins } from '../plugins/conditionallyAllowCors';
import readJsonFile from './readJsonFile';
import { extendRestrictedAttributesAllowList, validateSafeRequestRestrictedAttributes } from './safeRequest';
import { setConfigureRequestLog } from './logging/fastifyPlugin';
import { setCreateSsrFetch } from './createSsrFetch';
import { setEventLoopDelayThreshold, setEventLoopDelayPercentile } from './createCircuitBreaker';
import setupDnsCache from './setupDnsCache';
import { configurePWA } from '../pwa';
import { validatePWAConfig } from './validation';
import { setErrorPage } from '../plugins/reactHtml/staticErrorPage';
import { setRedirectAllowList } from './redirectAllowList';

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

export const CONFIGURATION_KEY = 'appConfig';

export const getModulesUsingExternals = () => modulesUsingExternals.toJS();

export const setModulesUsingExternals = (moduleNames) => {
  modulesUsingExternals = new ImmutableSet(moduleNames);
};

const logModuleLoad = (moduleName, moduleVersion) => {
  console.info('Loaded module %s@%s', moduleName, moduleVersion);
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

function getRootModuleProvidedExternals() {
  // getTenantRootModule is only added when a root module provides an external
  const RootModule = global.getTenantRootModule && global.getTenantRootModule();
  return (RootModule && RootModule[CONFIGURATION_KEY].providedExternals) || {};
}

function validateRequiredExternals(requiredExternals, moduleName) {
  const messages = [];
  const rootProvidedExternals = getRootModuleProvidedExternals();
  let moduleCanBeSafelyLoaded = true;
  const fallbackExternals = [];

  Object.keys(requiredExternals).forEach((externalName) => {
    const providedExternal = rootProvidedExternals[externalName];
    const requiredExternal = requiredExternals[externalName];
    // account for older requiredExternals api
    const semanticRange = requiredExternal.semanticRange || requiredExternal;
    const { version, filename, integrity } = requiredExternal;
    const fallbackExternalAvailable = filename && version;
    let failedValidationMessage;

    if (!providedExternal) {
      failedValidationMessage = `External '${externalName}' is required by ${moduleName}, but is not provided by the root module`;
    } else if (
      !validateExternal({
        providedVersion: providedExternal.version,
        requestedRange: semanticRange,
      })
    ) {
      failedValidationMessage = `${externalName}@${semanticRange} is required by ${moduleName}, but the root module provides ${providedExternal.version}`;
    }

    if (failedValidationMessage) {
      messages.push(failedValidationMessage);

      const fallbackBlockedByRootModule = !!providedExternal && !providedExternal.fallbackEnabled;

      if (fallbackBlockedByRootModule || !fallbackExternalAvailable) {
        moduleCanBeSafelyLoaded = false;
      }

      if (fallbackExternalAvailable) {
        fallbackExternals.push({
          moduleName,
          externalName,
          version,
          filename,
          semanticRange,
          integrity,
        });
      }
    }
  });

  if (messages.length > 0) {
    if (moduleCanBeSafelyLoaded || (process.env.ONE_DANGEROUSLY_ACCEPT_BREAKING_EXTERNALS === 'true')) {
      console.warn(messages.join('\n'));
    } else {
      throw new Error(messages.join('\n'));
    }
    fallbackExternals.forEach((external) => {
      addRequiredExternal(external);
    });
  }
}

export function validateCspIsPresent(csp) {
  if (!csp && process.env.ONE_DANGEROUSLY_DISABLE_CSP !== 'true') {
    throw new Error('Root module must provide a valid content security policy.');
  }
}

export function setRootModuleConfigurations(module, moduleName) {
  const {
    [CONFIGURATION_KEY]: {
      // Root Module Specific
      provideStateConfig,
      csp,
      corsOrigins,
      configureRequestLog,
      extendSafeRequestRestrictedAttributes = {},
      createSsrFetch,
      eventLoopDelayThreshold,
      eventLoopDelayPercentile,
      pwa,
      errorPageUrl,
      dnsCache,
      redirectAllowList,
    } = {},
    [META_DATA_KEY]: metaData,
  } = module;
  validateCspIsPresent(csp);
  clearModulesUsingExternals();
  if (provideStateConfig) {
    setStateConfig(provideStateConfig);
  }
  if (errorPageUrl) {
    setErrorPage(errorPageUrl);
  }
  if (redirectAllowList) {
    setRedirectAllowList(redirectAllowList);
  } else {
    // This is to maintain backwards compatibility.
    // This else-check can be removed in future versions.
    setRedirectAllowList([]);
  }
  setCorsOrigins(corsOrigins);
  extendRestrictedAttributesAllowList(extendSafeRequestRestrictedAttributes);
  setConfigureRequestLog(configureRequestLog);
  setCreateSsrFetch(createSsrFetch);
  if (eventLoopDelayThreshold) setEventLoopDelayThreshold(eventLoopDelayThreshold);
  if (eventLoopDelayPercentile) setEventLoopDelayPercentile(eventLoopDelayPercentile);
  configurePWA(validatePWAConfig(pwa, {
    clientStateConfig: getClientStateConfig(),
  }));
  setupDnsCache(dnsCache);

  logModuleLoad(moduleName, metaData.version);
}

export default function onModuleLoad({
  module,
  moduleName,
}) {
  const {
    [CONFIGURATION_KEY]: {
      // Root Module Specific
      providedExternals,
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
    setRootModuleConfigurations(module, moduleName);
    return;
  }

  if (providedExternals) {
    console.warn('Module %s attempted to provide externals. Only the root module can provide externals.', moduleName);
  }

  if (requiredExternals) {
    validateRequiredExternals(requiredExternals, moduleName);
    registerModuleUsingExternals(moduleName);
  }

  validateSafeRequestRestrictedAttributes(requiredSafeRequestRestrictedAttributes);

  logModuleLoad(moduleName, metaData.version);
}
