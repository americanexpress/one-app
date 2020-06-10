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

jest.useFakeTimers();

jest.mock('../../../src/server/utils/stateConfig', () => ({
  setStateConfig: jest.fn(),
  getClientStateConfig: jest.fn(),
  getServerStateConfig: jest.fn(),
  backupModuleStateConfig: jest.fn(() => ({
    client: {
      someUrl: 'http://client.com',
    },
    server: {
      someUrl: 'http://server.com',
    },
  })),
  restoreModuleStateConfig: jest.fn(),
}));

describe('pollModuleMap', () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  let loadModules;
  let loadModulesPromise;
  let incrementCounter;
  let incrementGauge;
  let setGauge;
  let resetGauge;
  let holocronMetrics;
  let getModulesUsingExternals;
  let setModulesUsingExternals;
  let restoreModuleStateConfig;
  let backupModuleStateConfig;

  function load({ min, max } = {}) {
    jest.resetModules();

    if (undefined === min) {
      delete process.env.ONE_MAP_POLLING_MIN;
    } else {
      process.env.ONE_MAP_POLLING_MIN = `${min}`;
    }

    if (undefined === max) {
      delete process.env.ONE_MAP_POLLING_MAX;
    } else {
      process.env.ONE_MAP_POLLING_MAX = `${max}`;
    }

    loadModulesPromise = Promise.resolve({});
    jest.mock('../../../src/server/utils/loadModules', () => jest.fn());
    loadModules = require('../../../src/server/utils/loadModules');
    loadModules.mockImplementation(() => loadModulesPromise);
    jest.mock('../../../src/server/utils/onModuleLoad');
    jest.mock('../../../src/server/metrics');
    ({
      incrementCounter,
      incrementGauge,
      setGauge,
      resetGauge,
      holocron: holocronMetrics,
    } = require('../../../src/server/metrics'));

    ({ getModulesUsingExternals, setModulesUsingExternals } = require('../../../src/server/utils/onModuleLoad'));
    ({ restoreModuleStateConfig, backupModuleStateConfig } = require('../../../src/server/utils/stateConfig'));

    return require('../../../src/server/utils/pollModuleMap');
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults min to 5 seconds', () => {
    const { MIN_POLL_TIME } = load();
    expect(MIN_POLL_TIME).toBe(5e3);
  });

  it('defaults max to 5 minutes', () => {
    const { MAX_POLL_TIME } = load();
    expect(MAX_POLL_TIME).toBe(3e5);
  });

  it('allows for a custom min in seconds', () => {
    const { MIN_POLL_TIME } = load({ min: 6 });
    expect(MIN_POLL_TIME).toBe(6e3);
  });

  it('throws if a custom min is unparsable', () => {
    expect(() => load({ min: 'not a number' })).toThrowError(
      'ONE_MAP_POLLING_MIN or ONE_MAP_POLLING_MAX misformatted'
    );
  });

  it('allows for a custom max in seconds', () => {
    const { MAX_POLL_TIME } = load({ max: 600 });
    expect(MAX_POLL_TIME).toBe(6e5);
  });

  it('throws if a custom max is unparsable', () => {
    expect(() => load({ max: 'not a number' })).toThrowError(
      'ONE_MAP_POLLING_MIN or ONE_MAP_POLLING_MAX misformatted'
    );
  });

  it('throws if a custom max is less than the min', () => {
    expect(() => load({ min: 6, max: 5 })).toThrowError(
      /ONE_MAP_POLLING_MAX is less than ONE_MAP_POLLING_MIN/
    );
  });

  it('calls loadModules', () => {
    const { default: pollModuleMap } = load();
    pollModuleMap();

    expect(console.log).toHaveBeenCalledWith('pollModuleMap: polling...');
    expect(loadModules).toHaveBeenCalledTimes(1);
    expect(incrementCounter).toHaveBeenCalledTimes(1);
    expect(incrementCounter).toHaveBeenCalledWith(holocronMetrics.moduleMapPoll);
    return loadModulesPromise;
  });

  it('schedules a new polling', () => {
    const { default: pollModuleMap } = load();
    pollModuleMap();
    expect(loadModules).toHaveBeenCalledTimes(1);
    return loadModulesPromise
      .then(() => {
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout.mock.calls[0][0]).toBe(pollModuleMap);
      });
  });

  it('does not reset the modules using externals on poll success', () => {
    const { default: pollModuleMap } = load();
    pollModuleMap();

    return loadModulesPromise
      .then(() => {
        expect(getModulesUsingExternals).toHaveBeenCalledTimes(1);
        expect(setModulesUsingExternals).not.toHaveBeenCalled();
      });
  });

  it('resets the modules using externals on poll failure', async () => {
    const { default: pollModuleMap } = load();

    console.log
      // monitor setup
      .mockImplementationOnce(() => { /* noop a few times */ })
      // pollModuleMap run 1
      .mockImplementationOnce(() => { throw new Error('STDOUT pipe closed unexpectedly'); });

    await pollModuleMap();

    expect(getModulesUsingExternals).toHaveBeenCalledTimes(1);
    expect(setModulesUsingExternals).toHaveBeenCalledTimes(1);
    expect(setModulesUsingExternals).toHaveBeenCalledWith(['module-a', 'module-b']);
  });

  it('restores the state config on poll failure', async () => {
    const { default: pollModuleMap } = load();

    console.log
      // monitor setup
      .mockImplementationOnce(() => { /* noop a few times */ })
      // pollModuleMap run 1
      .mockImplementationOnce(() => { throw new Error('STDOUT pipe closed unexpectedly'); });

    await pollModuleMap();
    expect(backupModuleStateConfig).toHaveBeenCalled();
    expect(restoreModuleStateConfig.mock.calls).toMatchSnapshot();
  });

  it('does not reset the modules when error was thrown getting modules using externals', async () => {
    const { default: pollModuleMap } = load();

    getModulesUsingExternals.mockImplementationOnce(() => { throw new Error('failed to get modules using externals'); });

    await pollModuleMap();
    expect(getModulesUsingExternals).toHaveBeenCalledTimes(1);
    expect(setModulesUsingExternals).not.toHaveBeenCalled();
  });

  it('schedules a new polling despite console.log throwing on the initial check', async () => {
    const { default: pollModuleMap } = load();
    console.log
      // monitor setup
      .mockImplementationOnce(() => { /* noop a few times */ })
      // pollModuleMap run 1
      .mockImplementationOnce(() => { throw new Error('STDOUT pipe closed unexpectedly'); });
    await pollModuleMap();

    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout.mock.calls[0][0]).toBe(pollModuleMap);
  });

  it('schedules a new polling despite console.log throwing on a later poll', async () => {
    const { default: pollModuleMap, MIN_POLL_TIME } = load();
    console.log
      // monitor setup
      .mockImplementationOnce(() => { /* noop a few times */ })
      // pollModuleMap run 1
      .mockImplementationOnce(() => { /* noop a few times */ })
      .mockImplementationOnce(() => { /* noop a few times */ })
      // pollModuleMap run 2
      .mockImplementationOnce(() => { /* noop a few times */ })
      .mockImplementationOnce(() => { /* noop a few times */ })
      // pollModuleMap run 3
      .mockImplementationOnce(() => { throw new Error('STDOUT pipe closed unexpectedly later on'); });

    await pollModuleMap();
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout.mock.calls[0][0]).toBe(pollModuleMap);

    await pollModuleMap();
    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(setTimeout.mock.calls[1][0]).toBe(pollModuleMap);

    await pollModuleMap();
    expect(setTimeout).toHaveBeenCalledTimes(3);
    expect(setTimeout.mock.calls[2][0]).toBe(pollModuleMap);
    expect(setTimeout.mock.calls[2][1]).toBe(MIN_POLL_TIME);
  });

  it('schedules a new poll after a polling error despite resetGauge throwing', async () => {
    const { default: pollModuleMap, MIN_POLL_TIME } = load();
    resetGauge.mockClear()
      .mockImplementationOnce(() => { /* noop a few times */ })
      .mockImplementationOnce(() => { /* noop a few times */ })
      .mockImplementationOnce(() => { throw new Error('unable to increment gague'); });

    await pollModuleMap();
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout.mock.calls[0][0]).toBe(pollModuleMap);

    await pollModuleMap();
    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(setTimeout.mock.calls[1][0]).toBe(pollModuleMap);

    await pollModuleMap();
    expect(setTimeout).toHaveBeenCalledTimes(3);
    expect(setTimeout.mock.calls[2][0]).toBe(pollModuleMap);
    expect(setTimeout.mock.calls[2][1]).toBe(MIN_POLL_TIME);
  });

  it('schedules a new poll after a polling error despite setGauge throwing', async () => {
    const { default: pollModuleMap, MIN_POLL_TIME } = load();
    setGauge.mockClear()
      .mockImplementationOnce(() => { /* noop a few times */ })
      .mockImplementationOnce(() => { /* noop a few times */ })
      .mockImplementationOnce(() => { throw new Error('unable to increment gague'); });

    await pollModuleMap();
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout.mock.calls[0][0]).toBe(pollModuleMap);

    await pollModuleMap();
    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(setTimeout.mock.calls[1][0]).toBe(pollModuleMap);

    await pollModuleMap();
    expect(setTimeout).toHaveBeenCalledTimes(3);
    expect(setTimeout.mock.calls[2][0]).toBe(pollModuleMap);
    expect(setTimeout.mock.calls[2][1]).toBe(MIN_POLL_TIME);
  });

  it('schedules a new polling that does not prevent the event loop from exiting', () => {
    const { default: pollModuleMap } = load();
    const mockUnref = jest.fn();
    setTimeout.mockImplementationOnce(() => ({ unref: mockUnref }));
    pollModuleMap();
    expect(loadModules).toHaveBeenCalledTimes(1);

    return loadModulesPromise
      .then(() => {
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(mockUnref).toHaveBeenCalledTimes(1);
      });
  });

  it('resets the time to the next polling to the minimum if there were updates', () => {
    const { default: pollModuleMap } = load();
    const moduleMapUpdates = { 'module-name': '1.2.3' };
    loadModulesPromise = Promise.resolve(moduleMapUpdates);
    pollModuleMap();
    expect(loadModules).toHaveBeenCalledTimes(1);

    return loadModulesPromise
      .then(() => {
        expect(console.log).toHaveBeenCalledTimes(3);
        expect(console.log.mock.calls[2][0]).toMatch(/^pollModuleMap: 1 modules loaded\/updated:$/);
        expect(console.log.mock.calls[2][1]).toEqual(moduleMapUpdates);

        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout).toHaveBeenCalledWith(pollModuleMap, 5e3);

        expect(setGauge).toHaveBeenCalledTimes(1);
        expect(setGauge).toHaveBeenCalledWith(holocronMetrics.moduleMapPollWait, 5);
        expect(resetGauge).toHaveBeenCalledTimes(1);
        expect(resetGauge).toHaveBeenCalledWith(holocronMetrics.moduleMapPollConsecutiveErrors);
      });
  });

  it('increases the time to the next polling if there were no updates', () => {
    const { default: pollModuleMap } = load();
    pollModuleMap();
    expect(loadModules).toHaveBeenCalledTimes(1);

    return loadModulesPromise
      .then(() => {
        expect(console.log).toHaveBeenCalledTimes(3);
        expect(console.log.mock.calls[2][0]).toMatch(
          /^pollModuleMap: no updates, looking again in \d+s$/
        );

        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout.mock.calls[0][0]).toBe(pollModuleMap);
        expect(setTimeout.mock.calls[0][1]).toBeGreaterThanOrEqual(5e3 * 1.25);

        expect(setGauge).toHaveBeenCalledTimes(1);
        expect(setGauge.mock.calls[0][0]).toBe(holocronMetrics.moduleMapPollWait);
        expect(setGauge.mock.calls[0][1]).toBeGreaterThanOrEqual(5 * 1.25);
        // ensure we're using seconds, not milliseconds
        expect(setGauge.mock.calls[0][1]).toBeLessThan(8 * 1.25);
      });
  });

  it('resets the time to the next polling to the minimum if there were errors', () => {
    const { default: pollModuleMap } = load();
    const error = { message: 'sample test error' };
    loadModulesPromise = Promise.reject(error);
    pollModuleMap();
    expect(loadModules).toHaveBeenCalledTimes(1);

    return loadModulesPromise
      // catch and then so as to run after pollModuleMap's error handling
      .catch((err) => err)
      .then(() => {
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledWith('pollModuleMap: error polling', error);

        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout).toHaveBeenCalledWith(pollModuleMap, 5e3);

        expect(setGauge).toHaveBeenCalledTimes(1);
        expect(setGauge).toHaveBeenCalledWith(holocronMetrics.moduleMapPollWait, 5);
        expect(incrementGauge).toHaveBeenCalledTimes(1);
        expect(incrementGauge).toHaveBeenCalledWith(holocronMetrics.moduleMapPollConsecutiveErrors);
      });
  });

  it('schedules a new polling despite console.error throwing on the initial check', async () => {
    const { default: pollModuleMap } = load();
    loadModulesPromise = Promise.reject(new Error('sample test error'));
    console.error.mockImplementationOnce(() => { throw new Error('STDERR pipe closed unexpectedly'); });
    await pollModuleMap();

    expect(setTimeout).toHaveBeenCalledTimes(1);
  });

  it('schedules a new poll after a polling error despite console.error throwing', async () => {
    const { default: pollModuleMap } = load();
    console.error
      .mockImplementationOnce(() => { /* noop a few times */ })
      .mockImplementationOnce(() => { /* noop a few times */ })
      .mockImplementationOnce(() => { throw new Error('STDERR pipe closed unexpectedly'); });

    loadModulesPromise = Promise.reject(new Error('sample test error'));

    await pollModuleMap();
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout.mock.calls[0][0]).toBe(pollModuleMap);

    await pollModuleMap();
    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(setTimeout.mock.calls[1][0]).toBe(pollModuleMap);

    await pollModuleMap();
    expect(setTimeout).toHaveBeenCalledTimes(3);
    expect(setTimeout.mock.calls[2][0]).toBe(pollModuleMap);
  });

  it('schedules a new poll after a polling error despite incrementGauge throwing', async () => {
    const { default: pollModuleMap } = load();
    incrementGauge.mockClear()
      .mockImplementationOnce(() => { /* noop a few times */ })
      .mockImplementationOnce(() => { /* noop a few times */ })
      .mockImplementationOnce(() => { throw new Error('unable to increment gague'); });

    loadModulesPromise = Promise.reject(new Error('sample test error'));

    await pollModuleMap();
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout.mock.calls[0][0]).toBe(pollModuleMap);

    await pollModuleMap();
    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(setTimeout.mock.calls[1][0]).toBe(pollModuleMap);

    await pollModuleMap();
    expect(setTimeout).toHaveBeenCalledTimes(3);
    expect(setTimeout.mock.calls[2][0]).toBe(pollModuleMap);
  });

  it('marks the module map as healthy if there were no errors', () => {
    expect.assertions(2);
    const { default: pollModuleMap, getModuleMapHealth } = load();
    pollModuleMap();
    expect(loadModules).toHaveBeenCalledTimes(1);

    return loadModulesPromise
      .then(() => {
        expect(getModuleMapHealth()).toBe(true);
      });
  });

  it('marks the module map as unhealthy if there is an error', () => {
    expect.assertions(2);
    const { default: pollModuleMap, getModuleMapHealth } = load();
    const error = { message: 'sample test error' };
    loadModulesPromise = Promise.reject(error);
    pollModuleMap();
    expect(loadModules).toHaveBeenCalledTimes(1);
    return loadModulesPromise
      // catch and then so as to run after pollModuleMap's error handling
      .catch((err) => err)
      .then(() => {
        expect(getModuleMapHealth()).toBe(false);
      });
  });

  describe('polling monitor', () => {
    it('does not start before pollModuleMap is started', async () => {
      const { default: pollModuleMap } = load();
      expect(setInterval).toHaveBeenCalledTimes(0);

      await pollModuleMap();
    });

    it('starts after pollModuleMap is started', async () => {
      const { default: pollModuleMap } = load();

      expect(setInterval).toHaveBeenCalledTimes(0);
      await pollModuleMap();
      expect(setInterval).toHaveBeenCalledTimes(1);
    });

    it('starts only once after pollModuleMap is started', async () => {
      const { default: pollModuleMap } = load();

      expect(setInterval).toHaveBeenCalledTimes(0);
      await pollModuleMap();
      expect(setInterval).toHaveBeenCalledTimes(1);
      await pollModuleMap();
      expect(setInterval).toHaveBeenCalledTimes(1);
    });

    it('restarts polling if no poll has occurred for a maximum poll time duration', async () => {
      jest.spyOn(Date, 'now');
      const { default: pollModuleMap } = load({ min: 5, max: 10 });

      Date.now.mockImplementationOnce(() => 0);
      await pollModuleMap();
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout.mock.calls[0][0]).toBe(pollModuleMap);

      Date.now.mockImplementationOnce(() => 5e3);
      await pollModuleMap();
      expect(setTimeout).toHaveBeenCalledTimes(2);
      expect(setTimeout.mock.calls[1][0]).toBe(pollModuleMap);

      Date.now.mockImplementationOnce(() => 10e3);
      await pollModuleMap();
      expect(setTimeout).toHaveBeenCalledTimes(3);
      expect(setTimeout.mock.calls[2][0]).toBe(pollModuleMap);

      Date.now.mockImplementationOnce(() => 20e3);
      await pollModuleMap();
      expect(setTimeout).toHaveBeenCalledTimes(4);
      expect(setTimeout.mock.calls[3][0]).toBe(pollModuleMap);

      Date.now.mockImplementationOnce(() => 30e3);
      expect(setInterval).toHaveBeenCalledTimes(1);
      setInterval.mock.calls[0][0]();
      expect(setImmediate).not.toHaveBeenCalled();
      expect(setTimeout).toHaveBeenCalledTimes(4);

      Date.now.mockImplementationOnce(() => 32e3);
      expect(setImmediate).not.toHaveBeenCalled();
      setInterval.mock.calls[0][0]();
      expect(setImmediate).toHaveBeenCalledTimes(1);
      expect(setImmediate.mock.calls[0][0]).toBe(pollModuleMap);
    });

    it('logs when polling is not considered stopped', async () => {
      jest.spyOn(Date, 'now');
      const { default: pollModuleMap } = load({ min: 5, max: 10 });

      Date.now.mockImplementationOnce(() => 5e3);
      await pollModuleMap();

      Date.now.mockImplementationOnce(() => 7e3);
      console.log.mockClear();
      expect(setInterval).toHaveBeenCalledTimes(1);
      setInterval.mock.calls[0][0]();
      expect(console.log).toHaveBeenCalledTimes(2);
      expect(console.log.mock.calls[0]).toMatchSnapshot();
      expect(console.log.mock.calls[1]).toMatchSnapshot();
    });

    it('logs when polling is considered stopped', async () => {
      jest.spyOn(Date, 'now');
      const { default: pollModuleMap } = load({ min: 5, max: 10 });

      Date.now.mockImplementationOnce(() => 5e3);
      await pollModuleMap();

      Date.now.mockImplementationOnce(() => 16e3);
      console.log.mockClear();
      expect(setInterval).toHaveBeenCalledTimes(1);
      setInterval.mock.calls[0][0]();
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(console.log.mock.calls[0]).toMatchSnapshot();
      expect(console.warn).toHaveBeenCalledTimes(2);
      expect(console.warn.mock.calls[0]).toMatchSnapshot();
      expect(console.warn.mock.calls[1]).toMatchSnapshot();
    });
  });
});
