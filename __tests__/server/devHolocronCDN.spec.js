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

import fs from 'fs';
import '../../src/server/devHolocronCDN';

jest.mock('cors', () => jest.fn(() => (req, res, next) => next()));
jest.mock('../../src/server/utils/devCdnFactory', () => jest.fn(() => (req, res, next) => next()));
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
    let oneAppDevCdn;

    beforeEach(() => {
      jest.resetModules();
    });

    async function load() {
      oneAppDevCdn = require('../../src/server/utils/devCdnFactory');

      const devHolocronCDN = require('../../src/server/devHolocronCDN').default;

      const fastify = await devHolocronCDN();

      return fastify;
    }

    it('should add one-app-dev-cdn to the static route', async () => {
      await load();
      expect(oneAppDevCdn).toHaveBeenCalled();
    });
  });
});
