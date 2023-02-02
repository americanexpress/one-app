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

    async function load() {
      cors = require('cors');
      oneAppDevCdn = require('@americanexpress/one-app-dev-cdn');

      const devHolocronCDN = require('../../src/server/devHolocronCDN').default;

      const fastify = await devHolocronCDN();

      return fastify;
    }

    it('should add cors to the app', async () => {
      await load();
      expect(cors).toHaveBeenCalled();
    });

    it('should add @americanexpress/one-app-dev-cdn to the static route', async () => {
      await load();
      expect(oneAppDevCdn).toHaveBeenCalled();
    });

    it('should give @americanexpress/one-app-dev-cdn the path to the static directory', async () => {
      expect.assertions(1);
      const moduleMapUrl = 'https://example.com/module-map.json';
      process.argv = [
        '',
        '',
        '--module-map-url',
        moduleMapUrl,
      ];

      await load();

      return findUp('package.json')
        .then((filepath) => {
          expect(oneAppDevCdn).toHaveBeenCalledWith({
            localDevPublicPath: path.join(path.dirname(filepath), 'static'),
            remoteModuleMapUrl: moduleMapUrl,
            useLocalModules: true,
          });
        });
    });

    it('does not require useLocalModules when no static module-map', async () => {
      expect.assertions(1);
      fs.existsSync.mockImplementationOnce(() => false);
      const moduleMapUrl = 'https://example.com/module-map.json';
      process.argv = [
        '',
        '',
        '--module-map-url',
        moduleMapUrl,
      ];

      await load();

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
    let cors;
    let oneAppDevCdn;

    beforeEach(() => {
      jest.resetModules();
    });

    async function load() {
      cors = require('cors');
      oneAppDevCdn = require('@americanexpress/one-app-dev-cdn');
      corsMiddleware = jest.fn((req, res, next) => next());
      cors.mockReturnValue(corsMiddleware);
      oneAppDevCdnMiddleware = jest.fn((req, res, next) => next());
      oneAppDevCdn.mockReturnValue(oneAppDevCdnMiddleware);
      devHolocronCDN = require('../../src/server/devHolocronCDN').default;

      return devHolocronCDN();
    }

    it('should hit the cors middleware first', async () => {
      expect.assertions(3);
      const instance = await load();

      corsMiddleware.mockImplementationOnce((req, res) => res.sendStatus(204));

      const response = await instance.inject({
        method: 'GET',
        url: '/static/anything.json',
      });

      expect(corsMiddleware).toHaveBeenCalledTimes(1);
      expect(oneAppDevCdnMiddleware).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(204);
    });

    it('should hit the one-app-dev-cdn middleware after cors', async () => {
      expect.assertions(2);

      const instance = await load();

      await instance.inject({
        method: 'GET',
        url: '/static/anything.json',
      });

      expect(corsMiddleware).toHaveBeenCalledTimes(1);
      expect(oneAppDevCdnMiddleware).toHaveBeenCalledTimes(1);
    });

    it('should miss the one-app-dev-cdn middleware if not a static route', async () => {
      expect.assertions(2);

      const instance = await load();

      await instance.inject({
        method: 'GET',
        url: '/not-static.json',
      });

      expect(corsMiddleware).toHaveBeenCalledTimes(1);
      expect(oneAppDevCdnMiddleware).not.toHaveBeenCalled();
    });
  });
});
