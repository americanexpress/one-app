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

import fs, { promises as fsPromises } from 'node:fs';
import {
  getUserHomeDirectory,
  showCacheInfo,
  setupCacheFile,
  getCachedModuleFiles,
  writeToCache,
  removeExistingEntryIfConflicting,
  cacheFileName,
  oneAppDirectoryName,
  oneAppDirectoryPath,
  oneAppModuleCachePath,
} from '../../../src/server/utils/cdnCache';

jest.spyOn(fs, 'existsSync');
jest.spyOn(fs, 'readFileSync');
jest.spyOn(fs, 'writeFile');
jest.spyOn(fsPromises, 'stat');
jest.spyOn(fsPromises, 'mkdir');
jest.spyOn(fsPromises, 'writeFile');
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

let consoleDevSpy;

jest.mock('colorette');

describe('cacheUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // need this for now because we're not importing monkeypatch in tests
    console.dev = jest.fn();
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
    });

    it('showCacheInfo should handle error', async () => {
      const expectedError = new Error('File not found');
      fsPromises.stat.mockRejectedValue(expectedError);

      await showCacheInfo();

      expect(fsPromises.stat).toHaveBeenCalledWith(oneAppModuleCachePath);
      expect(console.log).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('There was error checking file stat', expectedError);
    });

    it('showCacheInfo should show file to delete', async () => {
      consoleDevSpy = jest.spyOn(console, 'dev').mockImplementation(() => {});
      const mockStats = {
        size: 1024 * 1024 * 5, // 5 MB
      };
      fsPromises.stat.mockResolvedValue(mockStats);

      await showCacheInfo();

      expect(console.dev).toHaveBeenCalledWith('Local module cache size is %sMB. To clear the cache, delete %s', '5.00', '~/.one-app/.one-app-module-cache');
    });
  });

  describe('setupCacheFile', () => {
    it('setupCacheFile should create cache directory and file', async () => {
      fsPromises.mkdir.mockResolvedValueOnce();
      fsPromises.writeFile.mockResolvedValueOnce();
      await setupCacheFile();

      expect(fsPromises.mkdir).toHaveBeenCalledWith(oneAppDirectoryPath, { recursive: true });
      expect(console.log).toHaveBeenCalledWith(`Successfully created ${oneAppDirectoryPath}`);
      expect(console.log).toHaveBeenCalledWith(`Creating ${cacheFileName}`);
      expect(fsPromises.writeFile).toHaveBeenCalledWith(oneAppModuleCachePath, JSON.stringify({}));
      expect(console.log).toHaveBeenCalledWith(
        `${cacheFileName} created successfully on ${oneAppModuleCachePath}`
      );
      expect(console.error).not.toHaveBeenCalled();
    });

    it('setupCacheFile should handle error when creating cache file', async () => {
      const expectedError = new Error('Failed to write file');
      fsPromises.mkdir.mockResolvedValueOnce();
      fsPromises.writeFile.mockRejectedValueOnce(expectedError);
      await setupCacheFile();
      expect(fsPromises.mkdir).toHaveBeenCalledWith(oneAppDirectoryPath, { recursive: true });
      expect(console.error).toHaveBeenCalledWith(
        `Error creating ${cacheFileName} on ${oneAppModuleCachePath}, \n${expectedError}`
      );
    });

    it('setupCacheFile should handle error when creating cache directory', async () => {
      const expectedError = new Error('Failed to create directory');
      fsPromises.mkdir.mockRejectedValue(expectedError);

      await setupCacheFile();
      expect(fsPromises.mkdir).toHaveBeenCalledWith(oneAppDirectoryPath, { recursive: true });
      expect(console.error).toHaveBeenCalledWith(
        `There was error creating ${oneAppDirectoryName} directory`
      );
    });
  });

  describe('getCachedModuleFiles', () => {
    beforeAll(() => {
      fsPromises.stat.mockResolvedValue('');
      fsPromises.mkdir.mockResolvedValue();
      fsPromises.writeFile.mockResolvedValue();
    });

    it('should return an empty object if the cache file does not exist', () => {
      fs.existsSync.mockImplementationOnce(() => false);
      const result = getCachedModuleFiles();
      expect(result).toEqual({});
    });

    it('should create a new cache file and return an empty object if the cache file does not exist', () => {
      fs.existsSync.mockImplementationOnce(() => false);
      const result = getCachedModuleFiles();
      expect(result).toEqual({});
    });

    it('should return an empty object if the cache file contains invalid JSON', () => {
      const invalidJSON = 'invalid JSON';
      fs.existsSync.mockImplementationOnce(() => true);
      fs.readFileSync.mockImplementationOnce(() => invalidJSON);

      const result = getCachedModuleFiles();
      let error;
      try {
        JSON.parse(invalidJSON);
      } catch (err) {
        error = err;
      }
      expect(console.error).toHaveBeenCalledWith('Could not parse JSON content', error);
      expect(result).toEqual({});
    });

    it('should return the content of the cache file as a JSON object if the cache file exists and contains valid JSON', () => {
      const validJSON = '{"module":"test"}';
      fs.existsSync.mockImplementationOnce(() => true);
      fs.readFileSync.mockImplementationOnce(() => validJSON);
      const result = getCachedModuleFiles();
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
      expect(console.log).toHaveBeenCalledWith(`There was an error updating content \n ${error}`);
    });
  });

  describe('removeDuplicatedModules', () => {
    it('removes the matching modules from cachedModules', () => {
      const url = '/path/to/moduleA/2.2.3/file.js';
      const cachedModules = {
        '/path/to/moduleA/1.2.3/file.js': 'data',
        '/path/to/moduleA/1.2.3/file.json': 'data',
        '/path/to/moduleB/1.2.3/file.js': 'data',
      };

      const result = removeExistingEntryIfConflicting(url, cachedModules);

      expect(result).toEqual({
        '/path/to/moduleA/1.2.3/file.json': 'data',
        '/path/to/moduleB/1.2.3/file.js': 'data',
      });

      expect(console.log).not.toHaveBeenCalled();
    });

    it('returns cachedModules unchanged if no module matches', () => {
      const url = '/path/to/moduleC/2.2.3/file.js';
      const cachedModules = {
        '/path/to/moduleA/1.2.3/file.js': 'data',
        '/path/to/moduleA/1.2.3/file.json': 'data',
        '/path/to/moduleB/1.2.3/file.js': 'data',
      };

      const result = removeExistingEntryIfConflicting(url, cachedModules);

      expect(result).toEqual(cachedModules);
      expect(console.log).not.toHaveBeenCalled();
    });
  });
});
