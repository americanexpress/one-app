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

import fs from 'fs';

import {
  getUserHomeDirectory,
  getCachedModules,
  writeToCache,
  removeDuplicatedModules,
  showCacheInfo,
  setupCacheFile,
  cacheFileName,
  oneAppDirectoryName,
  oneAppDirectoryPath,
  oneAppModuleCachePath,
} from '../../../src/server/utils/cacheCDNModules';

jest.mock('fs');
jest.mock('chalk', () => ({
  bold: {
    greenBright: (txt) => txt,
    cyanBright: (txt) => txt,
    redBright: (txt) => txt,
  },
}));

describe('Cache module utils', () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log');
    errorSpy = jest.spyOn(console, 'error');
    process.env.HOME = '';
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should get USERPROFILE for windows user', () => {
    delete process.env.HOME;
    process.env.USERPROFILE = 'Users/windows';
    expect(getUserHomeDirectory()).toBe('Users/windows');
  });

  describe('showCacheInfo', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should display the cache info when there is no error', () => {
      const mockStats = {
        size: 1048576 * 5, // 5 MB
      };

      fs.stat.mockImplementation((_path, callback) => {
        callback(null, mockStats);
      });

      showCacheInfo();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('CACHE INFORMATION'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('File size of .one-app-module-cache: 5.00'));
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should display an error when there is an error checking file stats', () => {
      const mockError = new Error('Test error');

      fs.stat.mockImplementation((_path, callback) => {
        callback(mockError, null);
      });

      showCacheInfo();

      expect(errorSpy).toHaveBeenCalledWith('There was error checking file stat', mockError);
    });
  });

  describe('setupCacheFile', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      fs.mkdir.mockRestore();
      fs.writeFileSync.mockRestore();
    });

    it('should log success message when directory and file are created', () => {
      fs.mkdir.mockImplementationOnce((_filePath, _options, cb) => cb(null));
      fs.writeFileSync.mockImplementationOnce(() => ({}));

      setupCacheFile();

      expect(logSpy).toHaveBeenCalledWith(`Successfully created ${oneAppDirectoryPath}`);
      expect(logSpy).toHaveBeenCalledWith(`Creating ${cacheFileName}`);
      expect(logSpy).toHaveBeenCalledWith(`${cacheFileName} created successfully on ${oneAppModuleCachePath}`);
    });

    it('should log error when unable to create a directory', () => {
      fs.mkdir.mockImplementationOnce((_filePath, _options, cb) => cb(new Error('Error creating directory')));
      fs.writeFileSync.mockImplementationOnce(() => {});

      setupCacheFile();
      expect(errorSpy).toHaveBeenCalledWith(`There was error creating ${oneAppDirectoryName} directory`);
      fs.mkdir.mockRestore();
    });

    it('should log error when unable to create a file', () => {
      const error = new Error('Cannot create file');

      fs.mkdir.mockImplementationOnce((_filePath, _options, cb) => cb(null));
      fs.writeFileSync.mockImplementationOnce(() => { throw error; });
      setupCacheFile();
      expect(errorSpy).toHaveBeenCalledWith(`Error creating ${cacheFileName} on ${oneAppModuleCachePath}, \n${error}`);
    });
  });

  describe('getCachedModules', () => {
    it('should return an empty object if the cache file does not exist', () => {
      fs.existsSync.mockImplementationOnce(() => false);

      const result = getCachedModules();

      expect(result).toEqual({});
    });

    it('should create a new cache file and return an empty object if the cache file does not exist', () => {
      fs.existsSync.mockImplementationOnce(() => false);
      fs.mkdir.mockImplementationOnce((_filePath, _options, cb) => cb(null));
      fs.writeFileSync.mockImplementationOnce(() => {});

      const result = getCachedModules();

      expect(logSpy).toHaveBeenCalledWith(`Successfully created ${oneAppDirectoryPath}`);
      expect(logSpy).toHaveBeenCalledWith(`${cacheFileName} created successfully on ${oneAppModuleCachePath}`);
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
