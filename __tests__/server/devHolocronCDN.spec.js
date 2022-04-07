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
/* eslint-disable global-require */

import path from 'path';
import fs from 'fs';
import findUp from 'find-up';
import request from 'supertest';
import '../../src/server/devHolocronCDN';

jest.mock('cors', () => jest.fn(() => (req, res, next) => next()));
jest.mock('@americanexpress/one-app-dev-cdn', () => jest.fn(() => (req, res, next) => next()));
jest.spyOn(fs, 'existsSync').mockImplementation(() => true);

describe('devHolocronCDN', () => {
  let originalProcessArgv;

  beforeAll(() => {
    originalProcessArgv = process.argv;
  });

  afterAll(() => {
    process.argv = originalProcessArgv;
  });

  describe('setup', () => {
    let cors;
    let oneAppDevCdn;

    beforeEach(() => {
      jest.resetModules();
    });

    function load() {
      cors = require('cors');
      oneAppDevCdn = require('@americanexpress/one-app-dev-cdn');
      return require('../../src/server/devHolocronCDN').default;
    }

    it('should export usable middleware', () => {
      const devHolocronCDN = load();
      expect(devHolocronCDN).toBeInstanceOf(Function);
    });

    it('should add cors to the app', () => {
      load();
      expect(cors).toHaveBeenCalled();
    });

    it('should add @americanexpress/one-app-dev-cdn to the static route', () => {
      load();
      expect(oneAppDevCdn).toHaveBeenCalled();
    });

    it('should give @americanexpress/one-app-dev-cdn the path to the static directory', () => {
      const moduleMapUrl = 'https://example.com/module-map.json';
      process.argv = [
        '',
        '',
        '--module-map-url',
        moduleMapUrl,
      ];

      load();
      return findUp('package.json')
        .then((filepath) => {
          expect(oneAppDevCdn).toHaveBeenCalledWith({
            localDevPublicPath: path.join(path.dirname(filepath), 'static'),
            remoteModuleMapUrl: moduleMapUrl,
            useLocalModules: true,
          });
        });
    });

    it('does not require useLocalModules when no static module-map', () => {
      fs.existsSync.mockImplementationOnce(() => false);
      const moduleMapUrl = 'https://example.com/module-map.json';
      process.argv = [
        '',
        '',
        '--module-map-url',
        moduleMapUrl,
      ];

      load();
      return findUp('package.json')
        .then((filepath) => {
          expect(oneAppDevCdn).toHaveBeenCalledWith({
            localDevPublicPath: path.join(path.dirname(filepath), 'static'),
            remoteModuleMapUrl: moduleMapUrl,
            useLocalModules: false,
          });
        });
    });
  });

  describe('routing', () => {
    let corsMiddleware;
    let oneAppDevCdnMiddleware;
    let devHolocronCDN;

    beforeEach(() => {
      jest.resetModules();
      const cors = require('cors');
      const oneAppDevCdn = require('@americanexpress/one-app-dev-cdn');
      corsMiddleware = jest.fn((req, res, next) => next());
      cors.mockReturnValue(corsMiddleware);
      oneAppDevCdnMiddleware = jest.fn((req, res, next) => next());
      oneAppDevCdn.mockReturnValue(oneAppDevCdnMiddleware);
      devHolocronCDN = require('../../src/server/devHolocronCDN').default;
    });

    it('should hit the cors middleware first', async () => {
      corsMiddleware.mockImplementationOnce((req, res) => res.sendStatus(204));
      const resp = await request(devHolocronCDN)
        .get('/static/anything.json');
      expect(corsMiddleware).toHaveBeenCalledTimes(1);
      expect(oneAppDevCdnMiddleware).not.toHaveBeenCalled();
      expect(resp.status).toBe(204);
    });

    it('should hit the one-app-dev-cdn middleware after cors', async () => {
      await request(devHolocronCDN)
        .get('/static/anything.json');
      expect(corsMiddleware).toHaveBeenCalledTimes(1);
      expect(oneAppDevCdnMiddleware).toHaveBeenCalledTimes(1);
    });

    it('should miss the one-app-dev-cdn middleware if not a static route', async () => {
      await request(devHolocronCDN)
        .get('/not-static.json');
      expect(corsMiddleware).toHaveBeenCalledTimes(1);
      expect(oneAppDevCdnMiddleware).not.toHaveBeenCalled();
    });
  });
});
