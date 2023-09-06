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

import fs, { promises as fsPromises } from 'fs';
import chalk from 'chalk';
import {
  getUserHomeDirectory,
  showCacheInfo,
  setupCacheFile,
  getCachedModules,
  writeToCache,
  removeDuplicatedModules,
  cacheFileName,
  oneAppDirectoryName,
  oneAppDirectoryPath,
  oneAppModuleCachePath,
} from '../../../src/server/utils/cdnCache';

jest.mock('fs', () => {
  const actualFsModule = jest.requireActual('fs');
  const actualFsPromisesModule = jest.requireActual('fs/promises');
  return {
    ...actualFsModule,
    existsSync: jest.spyOn(actualFsModule, 'existsSync'),
    readFileSync: jest.spyOn(actualFsModule, 'readFileSync'),
    ...actualFsPromisesModule,
    stat: jest.spyOn(actualFsPromisesModule, 'stat'),
    mkdir: jest.spyOn(actualFsPromisesModule, 'mkdir'),
    writeFile: jest.spyOn(actualFsPromisesModule, 'writeFile'),
  };
});

jest.mock('chalk', () => ({
  bold: {
    cyanBright: jest.fn((text) => text),
    greenBright: jest.fn((text) => text),
    redBright: jest.fn((text) => text),
  },
}));

describe('cacheUtils', () => {
  let logSpy;
  let errorSpy;
  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log');
    errorSpy = jest.spyOn(console, 'error');
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('should get USERPROFILE for windows user', () => {
    delete process.env.HOME;
    process.env.USERPROFILE = 'Users/windows';
    expect(getUserHomeDirectory()).toBe('Users/windows');
  });

  describe('showCacheInfo', () => {
    it('showCacheInfo should log cache information', async () => {
      const mockStats = {
        size: 1024 * 1024 * 5, // 5 MB
      };
      fsPromises.stat.mockResolvedValue(mockStats);

      await showCacheInfo();

      expect(fsPromises.stat).toHaveBeenCalledWith(oneAppModuleCachePath);
      expect(chalk.bold.cyanBright).toHaveBeenCalledTimes(2);
      expect(chalk.bold.redBright).toHaveBeenCalledWith('CACHE INFORMATION');
      expect(chalk.bold.greenBright).toHaveBeenCalledWith('5.00', 'MB');
    });

    it('showCacheInfo should handle error', async () => {
      const expectedError = new Error('File not found');
      fsPromises.stat.mockRejectedValue(expectedError);

      await showCacheInfo();

      expect(fsPromises.stat).toHaveBeenCalledWith(oneAppModuleCachePath);
      expect(logSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith('There was error checking file stat', expectedError);
    });
  });

  describe('setupCacheFile', () => {
    it('setupCacheFile should create cache directory and file', async () => {
      fsPromises.mkdir.mockResolvedValueOnce();
      fsPromises.writeFile.mockResolvedValueOnce();
      await setupCacheFile();

      expect(fsPromises.mkdir).toHaveBeenCalledWith(oneAppDirectoryPath, { recursive: true });
      expect(logSpy).toHaveBeenCalledWith(`Successfully created ${oneAppDirectoryPath}`);
      expect(logSpy).toHaveBeenCalledWith(`Creating ${cacheFileName}`);
      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        oneAppModuleCachePath,
        JSON.stringify('{}')
      );
      expect(logSpy).toHaveBeenCalledWith(`${cacheFileName} created successfully on ${oneAppModuleCachePath}`);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('setupCacheFile should handle error when creating cache file', async () => {
      const expectedError = new Error('Failed to write file');
      fsPromises.mkdir.mockResolvedValueOnce();
      fsPromises.writeFile.mockRejectedValueOnce(expectedError);
      await setupCacheFile();
      expect(fsPromises.mkdir).toHaveBeenCalledWith(oneAppDirectoryPath, { recursive: true });
      expect(errorSpy).toHaveBeenCalledWith(`Error creating ${cacheFileName} on ${oneAppModuleCachePath}, \n${expectedError}`);
    });

    it('setupCacheFile should handle error when creating cache directory', async () => {
      const expectedError = new Error('Failed to create directory');
      fsPromises.mkdir.mockRejectedValue(expectedError);

      await setupCacheFile();
      expect(fsPromises.mkdir).toHaveBeenCalledWith(oneAppDirectoryPath, { recursive: true });
      expect(errorSpy).toHaveBeenCalledWith(`There was error creating ${oneAppDirectoryName} directory`);
    });
  });

  describe('getCachedModules', () => {
    beforeAll(() => {
      fsPromises.stat.mockResolvedValue('');
      fsPromises.mkdir.mockResolvedValue();
      fsPromises.writeFile.mockResolvedValue();
    });

    it('should return an empty object if the cache file does not exist', () => {
      fs.existsSync.mockImplementationOnce(() => false);
      const result = getCachedModules();
      expect(result).toEqual({});
    });

    it('should create a new cache file and return an empty object if the cache file does not exist', () => {
      fs.existsSync.mockImplementationOnce(() => false);
      const result = getCachedModules();
      expect(result).toEqual({});
    });

    it('should return an empty object if the cache file contains invalid JSON', () => {
      const invalidJSON = 'invalid JSON';
      fs.existsSync.mockImplementationOnce(() => true);
      fs.readFileSync.mockImplementationOnce(() => invalidJSON);

      const result = getCachedModules();
      let error;
      try {
        JSON.parse(invalidJSON);
      } catch (err) {
        error = err;
      }
      expect(errorSpy).toHaveBeenCalledWith('Could not parse JSON content', error);
      expect(result).toEqual({});
    });

    it('should return the content of the cache file as a JSON object if the cache file exists and contains valid JSON', () => {
      const validJSON = '{"module":"test"}';
      fs.existsSync.mockImplementationOnce(() => true);
      fs.readFileSync.mockImplementationOnce(() => validJSON);
      const result = getCachedModules();
      expect(result).toEqual(JSON.parse(validJSON));
    });
  });

  describe('writeToCache', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set content on cache after a delay', () => {
      fs.writeFile.mockImplementation((_filePath, _content, callback) => callback(null));

      const content = { module: 'test' };
      writeToCache(content);

      expect(fs.writeFile).not.toHaveBeenCalled();

      jest.runAllTimers();

      expect(fs.writeFile).toHaveBeenCalled();
      expect(fs.writeFile.mock.calls[0][1]).toBe(JSON.stringify(content, null, 2));
    });

    it('should handle error when writing to file fails', () => {
      const error = new Error('write error');
      fs.writeFile.mockImplementation((_filePath, _content, callback) => callback(error));

      const content = { module: 'test' };
      writeToCache(content);

      jest.runAllTimers();

      expect(fs.writeFile).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(`There was an error updating content \n ${error}`);
    });
  });

  describe('removeDuplicatedModules', () => {
    it('removes the matching modules from cachedModules', () => {
      const url = '/somepath/moduleA/someotherpath';
      const cachedModules = {
        '/path/to/moduleA/1': 'data',
        '/path/to/moduleA/2': 'data',
        '/path/to/moduleB/1': 'data',
      };
      const moduleNames = ['moduleA', 'moduleB', 'moduleC'];

      const result = removeDuplicatedModules(url, cachedModules, moduleNames);

      expect(result).toEqual({
        '/path/to/moduleB/1': 'data',
      });

      expect(logSpy).toHaveBeenCalledWith('Deleted /path/to/moduleA/1 from cache');
      expect(logSpy).toHaveBeenCalledWith('Deleted /path/to/moduleA/2 from cache');
    });

    it('returns cachedModules unchanged if no module matches', () => {
      const url = '/somepath/moduleX/someotherpath';
      const cachedModules = {
        '/path/to/moduleA/1': 'data',
        '/path/to/moduleA/2': 'data',
        '/path/to/moduleB/1': 'data',
      };
      const moduleNames = ['moduleA', 'moduleB', 'moduleC'];

      const result = removeDuplicatedModules(url, cachedModules, moduleNames);

      expect(result).toEqual(cachedModules);
      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
