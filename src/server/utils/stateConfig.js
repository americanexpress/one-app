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
import url from 'url';
import envVarAllowList from './envVarAllowList';
import snakeCaseToCamelCase from './snakeCaseToCamelCase';

function parseEnvVar(name) {
  let val = process.env[name];

  if (val === 'undefined') {
    return undefined;
  }

  try {
    val = JSON.parse(val);
  } catch (error) {
    // swallow error
  }

  return val;
}

const stateConfigFromEnvVars = Object
  .keys(process.env)
  .filter((k) => envVarAllowList.includes(k))
  .reduce((acc, envVarName) => {
    const regexExec = /^ONE_(CLIENT_)?([A-Z0-9_]+)$/.exec(envVarName);

    if (!regexExec) return acc;

    const envVarNameSegment = regexExec[2];
    const configName = snakeCaseToCamelCase(envVarNameSegment);
    const parsedEnvVar = parseEnvVar(envVarName);

    if (regexExec[1]) {
      acc.client[configName] = parsedEnvVar;

      if (!acc.server[configName]) {
        acc.server[configName] = parsedEnvVar;
      }
    } else {
      acc.server[configName] = parsedEnvVar;
    }

    return acc;
  }, { client: {}, server: {} });

const allEnvVarConfigKeys = [...new Set([
  ...Object.keys(stateConfigFromEnvVars.client),
  ...Object.keys(stateConfigFromEnvVars.server),
])];

const pathToDevEndpoints = path.join(process.cwd(), '.dev', 'endpoints', 'index.js');

const stateConfigFromDevEndpoints = {};

if (process.env.NODE_ENV === 'development' && fs.existsSync(pathToDevEndpoints)) {
  const { SERVICES_PORT = 3002 } = process.env;
  // eslint-disable-next-line global-require,import/no-dynamic-require
  const devEndpoints = require(pathToDevEndpoints)();
  Object.entries(devEndpoints).forEach(([configName, { devProxyPath }]) => {
    const value = url.format({
      protocol: 'http',
      hostname: 'localhost',
      port: SERVICES_PORT,
      pathname: devProxyPath,
    });
    stateConfigFromDevEndpoints[configName] = value;
  });
}

let stateConfigFromModule = { server: {}, client: {} };
const configEnv = process.env.ONE_CONFIG_ENV;
const makeConfigEnvError = () => new Error('Failed to parse an object in the root module configuration due to missing ONE_CONFIG_ENV.');

// Set initial config state
let clientStateConfig = {
  ...stateConfigFromModule.client,
  ...stateConfigFromEnvVars.client,
  ...stateConfigFromDevEndpoints,
};

let serverStateConfig = {
  ...stateConfigFromModule.server,
  ...stateConfigFromEnvVars.server,
  ...stateConfigFromDevEndpoints,
};

const updateClientStateConfig = () => {
  clientStateConfig = {
    ...stateConfigFromModule.client,
    ...stateConfigFromEnvVars.client,
    ...stateConfigFromDevEndpoints,
  };
};

const updateServerStateConfig = () => {
  serverStateConfig = {
    ...stateConfigFromModule.server,
    ...stateConfigFromEnvVars.server,
    ...stateConfigFromDevEndpoints,
  };
};

export const setStateConfig = (providedStateConfig) => {
  stateConfigFromModule = Object.entries(providedStateConfig)
    .reduce((acc, [key, { client, server }]) => {
      if (client) {
        if (typeof client === 'object') {
          if (!configEnv) {
            throw makeConfigEnvError();
          }
          acc.client[key] = client[configEnv];
        } else {
          acc.client[key] = client;
        }
      }
      if (server) {
        if (typeof server === 'object') {
          if (!configEnv) {
            throw makeConfigEnvError();
          }
          acc.server[key] = server[configEnv];
        } else {
          acc.server[key] = server;
        }
      }
      return acc;
    }, { server: {}, client: {} });

  const clientStateConfigKeys = Object.keys(stateConfigFromModule.client);
  const serverStateConfigKeys = Object.keys(stateConfigFromModule.server);

  const missingServerConfig = clientStateConfigKeys
    .filter((v) => !serverStateConfigKeys.includes(v));
  const missingClientConfig = serverStateConfigKeys
    .filter((v) => !clientStateConfigKeys.includes(v));

  if (missingClientConfig.length !== 0) {
    throw new Error(`Root module attempted to set the following non-overrideable options for the server but not the client:
  ${missingClientConfig.join(',\n  ')}`);
  }

  if (missingServerConfig.length !== 0) {
    throw new Error(`Root module attempted to set the following non-overrideable options for the client but not the server:
  ${missingServerConfig.join(',\n  ')}`);
  }

  const allModuleConfigKeys = [...new Set([...clientStateConfigKeys, ...serverStateConfigKeys])];
  const configKeysSetByModuleAndEnvVar = allModuleConfigKeys
    .filter((v) => allEnvVarConfigKeys.includes(v));

  if (configKeysSetByModuleAndEnvVar.length !== 0) {
    throw new Error(`Root module attempted to set the following non-overrideable options that have been set by env var:
  ${configKeysSetByModuleAndEnvVar.join(',\n  ')}`);
  }
  updateClientStateConfig();
  updateServerStateConfig();
};

export const restoreModuleStateConfig = ({ client, server }) => {
  stateConfigFromModule.client = client;
  stateConfigFromModule.server = server;
  updateClientStateConfig();
  updateServerStateConfig();
};

export const backupModuleStateConfig = () => ({
  client: { ...stateConfigFromModule.client },
  server: { ...stateConfigFromModule.server },
});

export const getClientStateConfig = () => clientStateConfig;

export const getServerStateConfig = () => serverStateConfig;
