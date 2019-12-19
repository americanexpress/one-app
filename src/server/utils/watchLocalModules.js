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

// This file is only used in development so importing devDeps is not an issue
/* eslint "import/no-extraneous-dependencies": ["error", {"devDependencies": true}] */

import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import loadModule from 'holocron/loadModule.node';
import {
  getModules,
  getModuleMap,
  resetModuleRegistry,
} from 'holocron/moduleRegistry';
import onModuleLoad from './onModuleLoad';

export default function watchLocalModules() {
  const staticsDirectoryPath = path.resolve(__dirname, '../../../static');
  const moduleDirectory = path.resolve(staticsDirectoryPath, 'modules');
  const moduleMapPath = path.resolve(staticsDirectoryPath, 'module-map.json');
  const watcher = chokidar.watch(moduleDirectory);

  watcher.on('change', async (changedPath) => {
    if (!changedPath.endsWith('.node.js')) return;

    const match = changedPath.substring(moduleDirectory.length).match(/\/([^/]+)\/([^/]+)/);
    if (!match) return;

    const [, moduleNameChangeDetectedIn] = match;

    const moduleMap = JSON.parse(fs.readFileSync(moduleMapPath, 'utf8'));

    const module = await loadModule(
      moduleNameChangeDetectedIn,
      moduleMap.modules[moduleNameChangeDetectedIn],
      onModuleLoad
    );

    const modules = getModules().set(moduleNameChangeDetectedIn, module);
    resetModuleRegistry(modules, getModuleMap());
  });
}
