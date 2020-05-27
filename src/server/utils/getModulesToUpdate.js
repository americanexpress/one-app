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

import { areModuleEntriesEqual } from 'holocron/server';
import { getModulesUsingExternals } from './onModuleLoad';
import { getServerStateConfig } from './stateConfig';

export default function getModulesToUpdate(curr, next) {
  const { rootModuleName } = getServerStateConfig();
  if (!next[rootModuleName]) {
    throw new Error(`Unable to find root module "${rootModuleName}" in your module map. Make sure to provide One App with a root module that exists in your module map.`);
  }

  const modulesUsingExternals = getModulesUsingExternals();
  const rootUpdated = !areModuleEntriesEqual(curr[rootModuleName], next[rootModuleName]);
  return Object.keys(next)
    .filter((moduleName) => !areModuleEntriesEqual(curr[moduleName], next[moduleName])
    || (rootUpdated && modulesUsingExternals.includes(moduleName))
    );
}
