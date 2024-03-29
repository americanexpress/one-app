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

import path from 'node:path';
import fs from 'node:fs/promises';
import chokidar from 'chokidar';
import globSync from 'glob';
import loadModule from 'holocron/loadModule.node';
import {
  getModules,
  getModuleMap,
  resetModuleRegistry,
  addHigherOrderComponent,
} from 'holocron/moduleRegistry';
import onModuleLoad from './onModuleLoad';
import { promisify } from 'node:util';

const glob = promisify(globSync);

async function changeHandler(changedPath) {
  console.log('watcher Δ', changedPath);
  if (!changedPath.endsWith('.node.js')) return;

  // I had apprehension of this manual manipulation
  // but from what I can tell a file or directory with '/' in the name is not valid
  // Linux: https://stackoverflow.com/q/9847288
  // macOS: '/' from Finder is translated to ':'
  // Windows: https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#naming-conventions
  const parts = changedPath.split(path.sep);
  if (parts.length < 3) {
    console.warn(`detected a change in module static resources at "${changedPath}" but unable to reload it in the running server`);
    return;
  }

  const [moduleName] = parts;
  const moduleMap = getModuleMap();
  const moduleMapEntry = moduleMap.getIn(['modules', moduleName]);

  if (!moduleMapEntry) {
    console.warn(`module "${moduleName}" not in the module map, make sure to serve-module first`);
    return;
  }

  if (new URL(moduleMapEntry.getIn(['node', 'url'])).pathname !== `/static/modules/${changedPath}`) {
    // not a Holocron module entry bundle (e.g. might be using webpack chunking)
    // console.warn('not a Holocron entry!', changedPath);
    return;
  }

  console.log(`the Node.js bundle for ${moduleName} finished saving, attempting to load`);

  let newModule;
  try {
    // FIXME: this leads to a race condition later in editing the module map
    newModule = addHigherOrderComponent(await loadModule(
      moduleName,
      moduleMapEntry.toJS(),
      onModuleLoad
    ));
  } catch (error) {
    // loadModule already logs the error and then re-throws
    // logging again just adds noise for the developer
    return;
  }

  const newModules = getModules().set(moduleName, newModule);
  resetModuleRegistry(newModules, moduleMap);
  console.log(`finished reloading ${moduleName}`);
}

export default function watchLocalModules() {
  const staticsDirectoryPath = path.resolve(__dirname, '../../../static');
  const moduleDirectory = path.join(staticsDirectoryPath, 'modules');

  // chokidar
  //   .watch('*/*/*.node.js', {
  //     awaitWriteFinish: true,
  //     cwd: moduleDirectory,
  //     depth: 3,
  //     // usePolling: true,
  //   })
  //   .on('change', changeHandler);

  var previousStats;
  async function looper() {
    console.time('glob');
    const holocronEntrypoints = (await glob('*/*/*.node.js', { cwd: moduleDirectory }))
    .filter(p => { const parts = p.split('/'); return parts[0] === path.basename(parts[2], '.node.js') })
    .sort();
    // .map(p => path.join(moduleDirectory, p));
    console.timeEnd('glob');
    
    const currentStats = new Map();
    const statsToWait = [];
    holocronEntrypoints.forEach((holocronEntrypoint) => {
      console.time(holocronEntrypoint);
      // statsToWait.push(fs.stat(path.join(moduleDirectory, holocronEntrypoint)).then(stat => currentStats.set(holocronEntrypoint, stat)))
      statsToWait.push(fs.stat(path.join(moduleDirectory, holocronEntrypoint)).then(stat => {
        console.timeEnd(holocronEntrypoint);
        currentStats.set(holocronEntrypoint, stat)
      }))
    });
    await Promise.allSettled(statsToWait);

    if (!previousStats) {
      previousStats = currentStats;
      setTimeout(looper, 2e3);
      return;
    }

    const changes = [];
    for (const [holocronEntrypoint, currentStat] of currentStats.entries()) {
      if (!previousStats.has(holocronEntrypoint)) {
        // console.log('looper, new entry', holocronEntrypoint);
        changes.push(holocronEntrypoint);
        continue;
      }
      const previousStat = previousStats.get(holocronEntrypoint);
      // console.log('looper, change?', holocronEntrypoint, `${currentStat.mtimeMs} !==? ${previousStat.mtimeMs} || ${currentStat.size} !==? ${previousStat.size}`);
      if (currentStat.mtimeMs !== previousStat.mtimeMs || currentStat.size !== previousStat.size) {
        changes.push(holocronEntrypoint);
        continue;
      }
      continue;
    }

    previousStats = currentStats;
    setTimeout(looper, 3e3).unref();
    if (changes.length === 0) {
      return;
    }
    console.log('looper, changes', changes);

    // FIXME: wait for the writer to finish editing the file first
    for await (const holocronEntrypoint of changes) {
      await changeHandler(holocronEntrypoint);
    }
  }
  setImmediate(looper);
}
