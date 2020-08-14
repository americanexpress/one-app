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

import pidusage from 'pidusage';
import { getModule } from 'holocron';
import healthCheck, {
  getTickDelay,
  checkForRootModule,
  verifyThresholds,
} from '../../../src/server/middleware/healthCheck';
import { getModuleMapHealth } from '../../../src/server/utils/pollModuleMap';


jest.mock('holocron', () => ({
  getModule: jest.fn(),
}));

jest.mock('pidusage', () => jest.fn());

jest.mock('../../../src/server/utils/stateConfig', () => ({
  getClientStateConfig: jest.fn(() => ({
    rootModuleName: 'frank-lloyd-root',
  })),
}));

jest.mock('../../../src/server/utils/pollModuleMap', () => ({
  getModuleMapHealth: jest.fn(),
}));

describe('healthCheck', () => {
  const { hrtime } = process;
  const req = {};
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    sendStatus: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.hrtime = jest.fn(() => [0, 100]);
  });

  afterEach(() => {
    process.hrtime = hrtime;
  });

  describe('getTickDelay', () => {
    it('should call hrtime twice', async () => {
      await getTickDelay();
      expect(process.hrtime).toHaveBeenCalledTimes(2);
      expect(process.hrtime.mock.calls[0][0]).toBeUndefined();
      expect(process.hrtime.mock.calls[1][0]).toEqual([expect.any(Number), expect.any(Number)]);
    });

    it('should call return the tick delay', async () => {
      const delay = await getTickDelay();
      expect(delay).toEqual([expect.any(Number), expect.any(Number)]);
    });
  });

  describe('checkForRootModule', () => {
    it('should return true if the root module exists', () => {
      getModule.mockReturnValueOnce(() => 0);
      expect(checkForRootModule()).toBe(true);
    });

    it('should return false if the root module does not exist', () => {
      getModule.mockReturnValueOnce(undefined);
      expect(checkForRootModule()).toBe(false);
    });
  });

  describe('verifyThresholds', () => {
    it('should return true if all requirements are met', () => {
      const stats = {
        process: {
          cpu: 80,
          memory: 1.4e9,
          tickDelay: [0, 100],
        },
        holocron: { rootModuleExists: true },
      };
      expect(verifyThresholds(stats)).toBe(true);
    });

    it('should return false if CPU usage is greater than 80', () => {
      const stats = {
        process: {
          cpu: 80.1,
          memory: 1.4e9,
          tickDelay: [0, 100],
        },
        holocron: { rootModuleExists: true },
      };
      expect(verifyThresholds(stats)).toBe(false);
    });

    it('should return false if memory is above 1.4GB', () => {
      const stats = {
        process: {
          cpu: 80,
          memory: 1.4e9 + 1,
          tickDelay: [0, 100],
        },
        holocron: { rootModuleExists: true },
      };
      expect(verifyThresholds(stats)).toBe(false);
    });

    it('should return false if tick delay is greater than 1 second', () => {
      const stats = {
        process: {
          cpu: 80,
          memory: 1.4e9,
          tickDelay: [1, 100],
        },
        holocron: { rootModuleExists: true },
      };
      expect(verifyThresholds(stats)).toBe(false);
    });

    it('should return false if the root module does not exist', () => {
      const stats = {
        process: {
          cpu: 80,
          memory: 1.4e9,
          tickDelay: [0, 100],
        },
        holocron: { rootModuleExists: false },
      };
      expect(verifyThresholds(stats)).toBe(false);
    });
  });

  describe('middleware', () => {
    it('should return a 200 when all is good', async () => {
      pidusage.mockImplementationOnce((pid, cb) => cb(undefined, {
        cpu: 80,
        memory: 1.4e9,
      }));
      getModule.mockReturnValueOnce(() => 0);
      getModuleMapHealth.mockReturnValueOnce(true);
      await healthCheck(req, res);
      expect(res.sendStatus).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledTimes(1);
      expect(res.json.mock.calls[0][0]).toMatchSnapshot();
    });

    it('should return a 207 when the module map is not healthy', async () => {
      pidusage.mockImplementationOnce((pid, cb) => cb(undefined, {
        cpu: 80,
        memory: 1.4e9,
      }));
      getModule.mockReturnValueOnce(() => 0);
      getModuleMapHealth.mockReturnValueOnce(false);
      await healthCheck(req, res);
      expect(res.sendStatus).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(207);
      expect(res.json).toHaveBeenCalledTimes(1);
      expect(res.json.mock.calls[0][0]).toMatchSnapshot();
    });

    it('should return a 503 when any threshold has been passed', async () => {
      pidusage.mockImplementationOnce((pid, cb) => cb(undefined, {
        cpu: 80.1,
        memory: 1.4e9,
      }));
      getModule.mockReturnValueOnce(() => 0);
      getModuleMapHealth.mockReturnValueOnce(true);
      await healthCheck(req, res);
      expect(res.sendStatus).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledTimes(1);
      expect(res.json.mock.calls[0][0]).toMatchSnapshot();
    });

    it('should return a 500 if it can\'t get the stats', async () => {
      pidusage.mockImplementationOnce((pid, cb) => cb(new Error('no stats')));
      getModule.mockReturnValueOnce(() => 0);
      getModuleMapHealth.mockReturnValueOnce(true);
      await healthCheck(req, res);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(res.sendStatus).toHaveBeenCalledTimes(1);
      expect(res.sendStatus).toHaveBeenCalledWith(500);
    });
  });
});
