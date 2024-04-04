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

import path from 'node:path';
import fs from 'node:fs/promises';
import { glob } from 'glob';
import loadModule from 'holocron/loadModule.node';
import {
  getModules,
  getModuleMap,
  resetModuleRegistry,
  addHigherOrderComponent,
} from 'holocron/moduleRegistry';
import onModuleLoad from './onModuleLoad';

const CHANGE_WATCHER_INTERVAL = 1000;
const WRITING_FINISH_WATCHER_TIMEOUT = 400;

// why our own code instead of something like https://www.npmjs.com/package/chokidar?
// we did, but saw misses, especially when using @americanexpress/one-app-runner
// * occasional misses even on the native filesystem (e.g. macOS)
// * https://forums.docker.com/t/file-system-watch-does-not-work-with-mounted-volumes/12038
// * runner on macOS chokidar would see the first change but not subsequent changes, presumably due
//   to inode tracking and the way the build directories are destroyed and recreated
// * using runner with --envVars.CHOKIDAR_USEPOLLING=true had no effect
// for us the pattern of the files we want to check have a very consistent pattern and we don't need
// to know the changes in the sometimes very many other files, so we can skip a lot of work from a
// general solution

async function changeHandler(changedPath) {
  // I had apprehension of this manual manipulation
  // but from what I can tell a file or directory with '/' in the name is not valid
  // Linux: https://stackoverflow.com/q/9847288
  // macOS: '/' from Finder is translated to ':'
  // Windows: https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#naming-conventions
  const [moduleName] = changedPath.split(path.sep);
  const moduleMap = getModuleMap();
  const moduleMapEntry = moduleMap.getIn(['modules', moduleName]);

  if (!moduleMapEntry) {
    console.warn(`module "${moduleName}" not in the module map, make sure to serve-module first`);
    return;
  }

  console.log(`the Node.js bundle for ${moduleName} finished saving, attempting to load`);

  let newModule;
  try {
    // FIXME: this leads to a race condition later
    // (two modules changed at the same time, both editing different copies of the module map)
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

  // this may be an over-optimization in that it may be more overhead than it saves
  const stating = new Map();
  function dedupedStat(filePath) {
    if (!stating.has(filePath)) {
      stating.set(
        filePath,
        fs.stat(filePath)
          .then((fileStat) => {
            stating.delete(filePath);
            return fileStat;
          })
      );
    }

    return stating.get(filePath);
  }

  const checkForNoWrites = new Map();
  let nextWriteCheck = null;
  async function writesFinishWatcher() {
    nextWriteCheck = null;

    await Promise.allSettled(
      [...checkForNoWrites.entries()].map(async ([holocronEntrypoint, previousStat]) => {
        const currentStat = await dedupedStat(path.join(moduleDirectory, holocronEntrypoint));
        if (
          currentStat.mtimeMs !== previousStat.mtimeMs
          || currentStat.size !== previousStat.size
        ) {
          // need to check again later
          checkForNoWrites.set(holocronEntrypoint, currentStat);
          return;
        }

        setImmediate(changeHandler, holocronEntrypoint);
        checkForNoWrites.delete(holocronEntrypoint);
      })
    );

    if (!nextWriteCheck && checkForNoWrites.size > 0) {
      nextWriteCheck = setTimeout(writesFinishWatcher, WRITING_FINISH_WATCHER_TIMEOUT).unref();
    }
  }

  let previousStats;
  async function changeWatcher() {
    const holocronEntrypoints = (await glob('*/*/*.node.js', { cwd: moduleDirectory }))
      .filter((p) => {
        const parts = p.split('/');
        return parts[0] === path.basename(parts[2], '.node.js');
      })
      .sort();

    const currentStats = new Map();
    const statsToWait = [];
    holocronEntrypoints.forEach((holocronEntrypoint) => {
      statsToWait.push(
        dedupedStat(path.join(moduleDirectory, holocronEntrypoint))
          .then((stat) => currentStats.set(holocronEntrypoint, stat))
      );
    });
    await Promise.allSettled(statsToWait);

    if (!previousStats) {
      previousStats = currentStats;
      setTimeout(changeWatcher, CHANGE_WATCHER_INTERVAL).unref();
      return;
    }

    [...currentStats.entries()].forEach(([holocronEntrypoint, currentStat]) => {
      if (!previousStats.has(holocronEntrypoint)) {
        checkForNoWrites.set(holocronEntrypoint, currentStat);
        return;
      }

      const previousStat = previousStats.get(holocronEntrypoint);
      if (currentStat.mtimeMs !== previousStat.mtimeMs || currentStat.size !== previousStat.size) {
        checkForNoWrites.set(holocronEntrypoint, currentStat);
      }
    });

    previousStats = currentStats;
    setTimeout(changeWatcher, CHANGE_WATCHER_INTERVAL).unref();

    // wait for writes to the file to stop
    if (!nextWriteCheck && checkForNoWrites.size > 0) {
      nextWriteCheck = setTimeout(writesFinishWatcher, WRITING_FINISH_WATCHER_TIMEOUT).unref();
    }
  }

  setImmediate(changeWatcher);
}
