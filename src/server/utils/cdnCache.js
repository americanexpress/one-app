/*
 * Copyright 2023 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,either express
 * or implied. See the License for the specific language governing permissions and limitations
 * under the License.
 */

import path from 'node:path';
import fs, { promises as fsPromises } from 'node:fs';
import chalk from 'chalk';

export const getUserHomeDirectory = () => process.env.HOME || process.env.USERPROFILE;
export const cacheFileName = '.one-app-module-cache';
export const oneAppDirectoryName = '.one-app';
export const oneAppDirectoryPath = path.join(getUserHomeDirectory(), oneAppDirectoryName);
export const oneAppModuleCachePath = path.join(oneAppDirectoryPath, cacheFileName);

// show cache size and how to delete info on start
export const showCacheInfo = async () => {
  try {
    const stats = await fsPromises.stat(oneAppModuleCachePath);
    const fileSizeInMB = stats.size / (1024 * 1024); // bytes to mb
    const separator = '*'.repeat(50);
    console.info(chalk.bold.cyanBright(separator));
    console.info(chalk.bold.cyanBright('CACHE INFORMATION'));
    console.info('File size of %s: %s', cacheFileName, chalk.bold.greenBright(fileSizeInMB.toFixed(2), 'MB'));
    console.info('To clear the cache, please delete this file:');
    console.info('    %s', chalk.bold.redBright(path.join('~', oneAppDirectoryName, cacheFileName)));
    console.info(chalk.bold.cyanBright(separator));
  } catch (error) {
    console.error('There was error checking file stat', error);
  }
};

// setup folder and file
export const setupCacheFile = async () => {
  try {
    await fsPromises.mkdir(oneAppDirectoryPath, { recursive: true });
    console.log(`Successfully created ${oneAppDirectoryPath}`);
    console.log(`Creating ${cacheFileName}`);
    try {
      await fsPromises.writeFile(oneAppModuleCachePath, JSON.stringify({}));
      console.log(`${cacheFileName} created successfully on ${oneAppModuleCachePath}`);
    } catch (error) {
      console.error(`Error creating ${cacheFileName} on ${oneAppModuleCachePath}, \n${error}`);
    }
  } catch (error) {
    console.error(`There was error creating ${oneAppDirectoryName} directory`);
  }
};

// gets cached module from ~/.one-app/.one-app-module-cache
export const getCachedModuleFiles = () => {
  if (!fs.existsSync(oneAppModuleCachePath)) {
    setupCacheFile();
    return {};
  }

  try {
    showCacheInfo();
    const cachedContent = fs.readFileSync(oneAppModuleCachePath, 'utf8');
    return JSON.parse(cachedContent);
  } catch (error) {
    console.error('Could not parse JSON content', error);
    return {};
  }
};

let timerId = null;

export const writeToCache = (content, delay = 500) => {
  // added debounce
  clearTimeout(timerId);
  timerId = setTimeout(() => {
    fs.writeFile(oneAppModuleCachePath, JSON.stringify(content, null, 2), (error) => {
      if (error) {
        console.log(`There was an error updating content \n ${error}`);
      }
    });
    timerId = null;
  }, delay);
};

const stripVersion = (url) => {
  const parts = url.split('/');
  parts.splice(-2, 1);
  return parts.join('/');
};

export const removeExistingEntryIfConflicting = (url, cachedModuleFiles) => {
  const updatedCachedModules = { ...cachedModuleFiles };
  const strippedUrl = stripVersion(url);

  const matchingModule = Object.keys(cachedModuleFiles)
    .find((cachedUrl) => stripVersion(cachedUrl) === strippedUrl);

  if (matchingModule && matchingModule !== url) {
    delete updatedCachedModules[matchingModule];
  }
  return updatedCachedModules;
};
