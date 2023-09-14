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

import { getModule } from 'holocron';
import { updateModuleRegistry } from 'holocron/server';

import hash from 'object-hash';
import onModuleLoad, { CONFIGURATION_KEY } from './onModuleLoad';
import batchModulesToUpdate from './batchModulesToUpdate';
import getModulesToUpdate from './getModulesToUpdate';
import { getServerStateConfig } from './stateConfig';
import { setClientModuleMapCache } from './clientModuleMapCache';
import { updateCSP } from '../plugins/csp';
import addBaseUrlToModuleMap from './addBaseUrlToModuleMap';

let cachedModuleMapHash;
let rejectedModulesCache = {};

const loadModules = async () => {
  const moduleMapResponse = await fetch(process.env.HOLOCRON_MODULE_MAP_URL);
  const moduleMap = addBaseUrlToModuleMap(await moduleMapResponse.json());

  const moduleMapHash = hash(moduleMap);
  if (cachedModuleMapHash && cachedModuleMapHash === moduleMapHash) {
    return { loadedModules: {}, rejectedModules: rejectedModulesCache };
  }
  cachedModuleMapHash = moduleMapHash;
  const serverConfig = getServerStateConfig();
  // NOTE:: this function mutates the moduleMap
  const { loadedModules = {}, rejectedModules = {} } = await updateModuleRegistry({
    moduleMap,
    batchModulesToUpdate,
    onModuleLoad,
    getModulesToUpdate,
    listRejectedModules: true,
  });

  rejectedModulesCache = rejectedModules;
  const loadedModuleNames = Object.keys(loadedModules);

  if (loadedModuleNames.length > 0) {
    setClientModuleMapCache(moduleMap);
  }

  const rootModuleLoaded = loadedModuleNames.includes(serverConfig.rootModuleName);

  if (rootModuleLoaded) {
    const RootModule = getModule(serverConfig.rootModuleName);
    const { [CONFIGURATION_KEY]: { csp } = {} } = RootModule;
    updateCSP(csp);
  }

  return { loadedModules, rejectedModules };
};

export default loadModules;
