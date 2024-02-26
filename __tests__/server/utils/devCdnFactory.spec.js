/*
 * Copyright 2019 American Express Travel Related Services Company, Inc.
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

/* eslint-disable no-console -- console used in tests */
import util from 'node:util';
import fetch from 'node-fetch';
import fs from 'fs';
import rimraf from 'rimraf';
import path from 'path';
import mkdirp from 'mkdirp';
import { ProxyAgent } from 'proxy-agent';
import oneAppDevCdn from '../../../src/server/utils/devCdnFactory';
import {
  removeExistingEntryIfConflicting,
} from '../../../src/server/utils/cdnCache';

jest.mock('node-fetch');
jest.mock('pino');

jest.mock('../../../src/server/utils/cdnCache', () => ({
  getCachedModuleFiles: jest.fn(() => ({
    '/cdn/module-b/1.0.0/module-c.node.js': 'console.log("c");',
  })),
  writeToCache: jest.fn(() => ({})),
  removeExistingEntryIfConflicting: jest.fn((_, cachedModuleFiles) => cachedModuleFiles),
}));

const pathToStubs = path.join(__dirname, 'stubs');
const pathToCache = path.join(__dirname, '..', '.cache');
const mockLocalDevPublicPath = path.join(pathToStubs, 'public');

const origNodeEnv = process.env.NODE_ENV;

describe('one-app-dev-cdn', () => {
  jest.spyOn(console, 'warn');
  jest.spyOn(console, 'log');
  jest.spyOn(console, 'error');

  const defaultLocalMap = {
    key: 'not-used-in-development',
    modules: {
      'module-a': {
        node: {
          url: 'https://example.com/module-a/1.0.0/module-a.node.js',
          integrity: '123',
        },
        browser: {
          url: 'https://example.com/module-a/1.0.0/module-a.browser.js',
          integrity: '234',
        },
        legacyBrowser: {
          url: 'https://example.com/module-a/1.0.0/module-a.legacy.browser.js',
          integrity: '345',
        },
      },
    },
  };
  let defaultRemoteMap;

  const defaultPublicDirContentsSetting = {
    moduleMapContent: JSON.stringify(defaultLocalMap),
    modules: [
      { moduleName: 'module-a', moduleVersion: '1.0.0', bundleContent: 'console.log("a");' },
    ],
    allowCacheWrite: true,
  };

  const createPublicDir = (publicDirContents) => {
    const {
      moduleMapContent, modules, noContent, allowCacheWrite,
    } = publicDirContents;

    if (noContent) {
      return;
    }

    if (!allowCacheWrite) {
      mkdirp(pathToCache, { mode: 444 });
    }

    const modulesDir = path.join(mockLocalDevPublicPath, 'modules');

    mkdirp.sync(modulesDir);
    fs.writeFileSync(path.join(`${mockLocalDevPublicPath}/module-map.json`), moduleMapContent, { encoding: 'utf-8' });
    modules.forEach((module) => {
      const { moduleName, moduleVersion, bundleContent } = module;
      const pathToModuleBundle = path.join(modulesDir, moduleName, moduleVersion);
      mkdirp.sync(pathToModuleBundle);
      fs.writeFileSync(path.join(pathToModuleBundle, `${moduleName}.browser.js`), bundleContent, { encoding: 'utf-8' });
    });
  };

  const setupTest = ({
    nodeEnv = 'development',
    publicDirContentsSetting = defaultPublicDirContentsSetting,
    useLocalModules,
    remoteModuleMapUrl,
    appPort,
    useHost,
    routePrefix,
  } = {}) => {
    process.env.NODE_ENV = nodeEnv;

    createPublicDir(publicDirContentsSetting);
    return oneAppDevCdn({
      localDevPublicPath: mockLocalDevPublicPath,
      remoteModuleMapUrl,
      useLocalModules,
      appPort,
      useHost,
      routePrefix,
    });
  };

  const sanitizeModuleMapForSnapshot = (moduleMapString) => moduleMapString.replace(
    // eslint-disable-next-line unicorn/no-unsafe-regex -- regex used in test
    /(?:\d{1,3}\.){3}\d{1,3}:\d{1,8}/g,
    '0.0.0.0:3001'
  );

  process.env.HTTP_ONE_APP_DEV_CDN_PORT = 3001;

  beforeEach(() => {
    jest
      .resetAllMocks()
      .resetModules();
    defaultRemoteMap = {
      key: '234234',
      modules: {
        'module-b': {
          node: {
            url: 'https://example.com/cdn/module-b/1.0.0/module-b.node.js',
            integrity: '123',
          },
          browser: {
            url: 'https://example.com/cdn/module-b/1.0.0/module-b.browser.js',
            integrity: '234',
          },
          legacyBrowser: {
            url: 'https://example.com/cdn/module-b/1.0.0/module-b.legacy.browser.js',
            integrity: '345',
          },
        },
      },
    };
    removeExistingEntryIfConflicting.mockImplementation(
      (_, cachedModuleFiles) => cachedModuleFiles
    );
    fetch.mockImplementation((url) => Promise.reject(new Error(`no mock for ${url} set up`)));
  });

  it('add CORS headers based on appPort configuration value', () => {
    expect.assertions(3);
    const appPort = 5000;
    const fcdn = setupTest({ appPort, useLocalModules: true });

    return fcdn.inject()
      .get('/module-map.json')
      .headers({ Origin: `http://localhost:${appPort}` })

      .then((response) => {
        expect(response.headers['access-control-allow-origin']).toBe(`http://localhost:${appPort}`);
        expect(response.headers.vary).toEqual(expect.any(String));
        const varyHeaders = response.headers.vary.split(',').map((s) => s.trim());
        expect(varyHeaders).toContain('Origin');
      });
  });

  describe('usage', () => {
    it('should throw if localDevPublicPath is not given', () => {
      expect(() => oneAppDevCdn({
        remoteModuleMapUrl: 'https://my-domain.com/map/module-map.json',
        appPort: 3000,
      })).toThrowErrorMatchingSnapshot();
    });

    it('should throw if neither remoteModuleMapUrl nor useLocalModules is given', () => {
      expect(() => oneAppDevCdn({
        localDevPublicPath: mockLocalDevPublicPath,
        appPort: 3000,
      })).toThrowErrorMatchingSnapshot();
    });

    it('should throw if appPort is not given', () => {
      expect(
        () => oneAppDevCdn({
          localDevPublicPath: mockLocalDevPublicPath,
          remoteModuleMapUrl: 'https://my-domain.com/map/module-map.json',
        })
      ).toThrowErrorMatchingSnapshot();
    });
  });

  describe('module-map.json', () => {
    it('uses the local map overriding the cdn url placeholder with the one-app-dev-cdn url', () => {
      expect.assertions(3);
      const localMap = {
        key: 'not-used-in-development',
        modules: {
          'module-a': {
            node: {
              url: '[one-app-dev-cdn-url]/module-a/1.0.0/module-a.node.js',
              integrity: '123',
            },
            browser: {
              url: '[one-app-dev-cdn-url]/module-a/1.0.0/module-a.browser.js',
              integrity: '234',
            },
            legacyBrowser: {
              url: '[one-app-dev-cdn-url]/module-a/1.0.0/module-a.legacy.browser.js',
              integrity: '345',
            },
          },
        },
      };
      const fcdn = setupTest({
        useLocalModules: true,
        appPort: 3000,
        publicDirContentsSetting: {
          moduleMapContent: JSON.stringify(localMap),
          modules: [
            {
              moduleName: 'module-a',
              moduleVersion: '1.0.0',
              bundleContent: 'console.log("a");',
            },
          ],
        },
      });

      return fcdn.inject()
        .get('/module-map.json')
        .headers({ Host: 'localhost:3001' })
        .then((response) => {
          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toMatch(/^application\/json/);
          const responseBody = JSON.parse(response.body);
          expect(responseBody).toMatchSnapshot(
            {
              modules: {
                'module-a': {
                  node: {
                    url: 'http://localhost:3001/module-a/1.0.0/module-a.node.js',
                  },
                  browser: {
                    url: 'http://localhost:3001/module-a/1.0.0/module-a.browser.js',
                  },
                  legacyBrowser: {
                    url: 'http://localhost:3001/module-a/1.0.0/module-a.legacy.browser.js',
                  },
                },
              },
            }
          );
        });
    });

    it('does not use the local map when useLocalModules is false', () => {
      expect.assertions(3);

      const fcdn = setupTest({
        useLocalModules: false,
        remoteModuleMapUrl: 'https://example.com/cdn/module-map.json',
        appPort: 3000,
      });
      fetch.mockReturnJsonOnce(defaultRemoteMap);

      return fcdn.inject()
        .get('/module-map.json')
        .then((response) => {
          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toMatch(/^application\/json/);
          const responseBody = response.body;

          expect(responseBody.modules).not.toEqual(defaultLocalMap.modules);
        });
    });

    it('mirrors the remote map but modifies the key property and the module URLs', () => {
      expect.assertions(4);
      const remoteModuleMapUrl = 'https://my-domain.com/map/module-map.json';
      const fcdn = setupTest({ appPort: 3000, useLocalModules: false, remoteModuleMapUrl });
      fetch.mockReturnJsonOnce(defaultRemoteMap);

      const modifiedRemoteMap = {
        key: 'not-used-in-development',
        modules: {
          'module-b': {
            node: {
              url: 'http://localhost:3001/static/cdn/module-b/1.0.0/module-b.node.js',
              integrity: '123',
            },
            browser: {
              url: 'http://localhost:3001/static/cdn/module-b/1.0.0/module-b.browser.js',
              integrity: '234',
            },
            legacyBrowser: {
              url: 'http://localhost:3001/static/cdn/module-b/1.0.0/module-b.legacy.browser.js',
              integrity: '345',
            },
          },
        },
      };
      return fcdn.inject()
        .get('/module-map.json')
        .then((response) => {
          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toMatch(/^application\/json/);
          expect(response.body).toEqual(JSON.stringify(modifiedRemoteMap));
          expect(fetch.mock.calls[0]).toContain(remoteModuleMapUrl);
        });
    });

    it('modifies the key property and the module URLs using the req.host instead of localhost', () => {
      expect.assertions(4);
      const remoteModuleMapUrl = 'https://my-domain.com/map/module-map.json';
      const fcdn = setupTest({
        appPort: 3000, useLocalModules: false, remoteModuleMapUrl, useHost: true,
      });
      fetch.mockReturnJsonOnce(defaultRemoteMap);

      const modifiedRemoteMap = {
        key: 'not-used-in-development',
        modules: {
          'module-b': {
            node: {
              url: 'http://0.0.0.0:3001/static/cdn/module-b/1.0.0/module-b.node.js',
              integrity: '123',
            },
            browser: {
              url: 'http://0.0.0.0:3001/static/cdn/module-b/1.0.0/module-b.browser.js',
              integrity: '234',
            },
            legacyBrowser: {
              url: 'http://0.0.0.0:3001/static/cdn/module-b/1.0.0/module-b.legacy.browser.js',
              integrity: '345',
            },
          },
        },
      };
      return fcdn.inject()
        .get('/module-map.json')
        .headers({ Host: '127.0.0.1:53653' })
        .then((response) => {
          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toMatch(/^application\/json/);
          expect(
            sanitizeModuleMapForSnapshot(response.body)
          ).toEqual(JSON.stringify(modifiedRemoteMap));
          expect(fetch.mock.calls[0]).toContain(remoteModuleMapUrl);
        });
    });

    it('extends the remote map with the local map', () => {
      expect.assertions(4);
      const remoteModuleMapUrl = 'https://my-domain.com/map/module-map.json';

      const fcdn = setupTest({ remoteModuleMapUrl, useLocalModules: true, appPort: 3000 });
      fetch.mockReturnJsonOnce(defaultRemoteMap);

      return fcdn.inject()
        .get('/module-map.json')
        .then((response) => {
          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toMatch(/^application\/json/);
          expect(
            sanitizeModuleMapForSnapshot(response.body)
          ).toMatchSnapshot();
          expect(fetch.mock.calls[0]).toContain(remoteModuleMapUrl);
        });
    });
    it('extends the remote map with the local map and uses host instead of localhost', () => {
      expect.assertions(4);
      const remoteModuleMapUrl = 'https://my-domain.com/map/module-map.json';

      const fcdn = setupTest({
        remoteModuleMapUrl, useLocalModules: true, appPort: 3000, useHost: true,
      });
      fetch.mockReturnJsonOnce(defaultRemoteMap);

      return fcdn.inject()
        .get('/module-map.json')
        .then((response) => {
          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toMatch(/^application\/json/);
          expect(
            sanitizeModuleMapForSnapshot(response.body)
          ).toMatchSnapshot();
          expect(fetch.mock.calls[0]).toContain(remoteModuleMapUrl);
        });
    });

    it('does not extend the remote map with the local map when useLocalModules is false', () => {
      expect.assertions(4);
      const remoteModuleMapUrl = 'https://my-domain.com/map/module-map.json';
      const fcdn = setupTest({ useLocalModules: false, remoteModuleMapUrl, appPort: 3000 });
      fetch.mockReturnJsonOnce(defaultRemoteMap);

      return fcdn.inject()
        .get('/module-map.json')
        .then((response) => {
          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toMatch(/^application\/json/);

          expect(
            sanitizeModuleMapForSnapshot(response.body)
          ).toEqual(
            JSON.stringify({
              ...defaultRemoteMap,
              key: 'not-used-in-development',
            }).replace(/https:\/\/example.com\//g, 'http://localhost:3001/static/')
          );
          expect(fetch.mock.calls[0]).toContain(remoteModuleMapUrl);
        });
    });

    it('always lets the local map win', () => {
      expect.assertions(4);
      const remoteModuleMapUrl = 'https://my-domain.com/map/module-map.json';

      const fcdn = setupTest({ remoteModuleMapUrl, useLocalModules: true, appPort: 3000 });
      const remoteMap = {
        key: '1233',
        modules: {
          'module-a': {
            node: {
              url: 'https://example.com/cdn/module-b/2.0.0/module-b.node.js',
              integrity: '123',
            },
            browser: {
              url: 'https://example.com/cdn/module-b/2.0.0/module-b.browser.js',
              integrity: '234',
            },
            legacyBrowser: {
              url: 'https://example.com/cdn/module-b/2.0.0/module-b.legacy.browser.js',
              integrity: '345',
            },
          },
        },
      };
      fetch.mockReturnJsonOnce(remoteMap);

      return fcdn.inject()
        .get('/module-map.json')
        .then((response) => {
          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toMatch(/^application\/json/);
          expect(response.body).toEqual(JSON.stringify(defaultLocalMap));
          expect(fetch.mock.calls[0]).toContain(remoteModuleMapUrl);
        });
    });

    it('warns and ignores error fetching remote module-map', () => {
      expect.assertions(6);
      const remoteModuleMapUrl = 'https://my-domain.com/map/module-map.json';
      const fcdn = setupTest({ remoteModuleMapUrl, useLocalModules: true, appPort: 3000 });
      fetch.mockReturnJsonOnce(new Error('simulated timeout or some other network error!'));

      return fcdn.inject()
        .get('/module-map.json')
        .then((response) => {
          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toMatch(/^application\/json/);
          expect(response.body).toEqual(JSON.stringify(defaultLocalMap));
          expect(fetch.mock.calls[0]).toContain(remoteModuleMapUrl);
          expect(console.warn).toHaveBeenCalledTimes(1);
          expect(util.format(...console.warn.mock.calls[0])).toMatch(
            /one-app-dev-cdn error loading module map from https:\/\/my-domain.com\/map\/module-map.json: Error: simulated timeout or some other network error!/
          );
        });
    });

    it('warns and ignores error loading invalid remote module-map', () => {
      expect.assertions(6);
      const remoteModuleMapUrl = 'https://my-domain.com/map/module-map.json';
      const fcdn = setupTest({ remoteModuleMapUrl, useLocalModules: true, appPort: 3000 });
      const invalidModuleMap = [];
      fetch.mockReturnJsonOnce(invalidModuleMap);

      return fcdn.inject()
        .get('/module-map.json')
        .then((response) => {
          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toMatch(/^application\/json/);
          expect(response.body).toEqual(JSON.stringify(defaultLocalMap));
          expect(fetch.mock.calls[0]).toContain(remoteModuleMapUrl);
          expect(console.warn).toHaveBeenCalledTimes(1);
          expect(util.format(...console.warn.mock.calls[0])).toMatch(
            /one-app-dev-cdn error loading module map from https:\/\/my-domain.com\/map\/module-map.json: TypeError: Cannot convert undefined or null to object/
          );
        });
    });

    it('does not attempt to fetch remote module map when remoteModuleMapUrl is not given', () => {
      expect.assertions(4);

      const fcdn = setupTest({
        appPort: 3000,
        useLocalModules: true,
      });

      return fcdn.inject()
        .get('/module-map.json')
        .then((response) => {
          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toMatch(/^application\/json/);
          expect(response.body).toEqual(JSON.stringify(defaultLocalMap));
          expect(fetch.mock.calls).toEqual([]);
        });
    });
  });

  describe('modules', () => {
    it('gets remote modules', async () => {
      expect.assertions(5);
      const fcdn = setupTest({
        useLocalModules: false,
        appPort: 3000,
        remoteModuleMapUrl: 'https://example.com/static/module-map.json',
        routePrefix: '/static',
      });

      fetch.mockReturnJsonOnce(defaultRemoteMap);
      fetch.mockReturnFileOnce('console.log("a");');
      const moduleMapResponse = await fcdn.inject()
        .get('/static/module-map.json');
      expect(moduleMapResponse.statusCode).toBe(200);
      expect(moduleMapResponse.headers['content-type']).toMatch(/^application\/json/);
      expect(
        sanitizeModuleMapForSnapshot(moduleMapResponse.body)
      ).toMatchSnapshot('module map response');

      const moduleResponse = await fcdn.inject()
        .get('/cdn/module-b/1.0.0/module-b.node.js');
      expect(moduleResponse.body).toBe('console.log("a");');
      expect(fetch.mock.calls).toEqual([
        [
          'https://example.com/static/module-map.json',
          {
            agent: expect.any(ProxyAgent),
          },
        ],
        [
          'https://example.com/cdn/module-b/1.0.0/module-b.node.js',
          {
            agent: expect.any(ProxyAgent),
            headers: {
              connection: 'keep-alive',
            },
          },
        ],
      ]);
    });

    it('gets remote modules from cached data if incoming url is matching', async () => {
      expect.assertions(6);
      const fcdn = setupTest({
        useLocalModules: false,
        appPort: 3000,
        remoteModuleMapUrl: 'https://example.com/module-map.json',
      });
      fetch.mockReturnJsonOnce(defaultRemoteMap);
      fetch.mockReturnFileOnce('console.log("a");');

      const moduleMapResponse = await fcdn.inject()
        .get('/module-map.json');

      expect(moduleMapResponse.statusCode).toBe(200);
      expect(moduleMapResponse.headers['content-type']).toMatch(/^application\/json/);
      expect(
        sanitizeModuleMapForSnapshot(moduleMapResponse.body)
      ).toMatchSnapshot('module map response');

      const moduleResponse = await fcdn.inject()
        .get('/cdn/module-b/1.0.0/module-c.node.js');
      expect(moduleResponse.statusCode).toBe(200);
      expect(moduleResponse.headers['content-type']).toMatch('application/json');
      expect(moduleResponse.body).toBe('console.log("c");');
    });

    it('returns a 404 if a request for something not known as a module from the module map comes in', async () => {
      expect.assertions(5);

      const fcdn = setupTest({
        useLocalModules: false,
        appPort: 3000,
        remoteModuleMapUrl: 'https://example.com/module-map.json',
      });
      fetch.mockReturnJsonOnce(defaultRemoteMap);
      await fcdn.ready();
      const moduleMapResponse = await fcdn.inject()
        .get('/module-map.json');

      expect(moduleMapResponse.statusCode).toBe(200);
      expect(moduleMapResponse.headers['content-type']).toMatch(/^application\/json/);
      expect(
        sanitizeModuleMapForSnapshot(moduleMapResponse.body)
      ).toMatchSnapshot('module map response');
      expect(fetch.mock.calls).toEqual(
        [
          [
            'https://example.com/module-map.json',
            {
              agent: expect.any(ProxyAgent),
            },
          ],
        ]
      );

      const moduleResponse = await fcdn.inject()
        .get('/cdn/not-a-module/1.0.0/module-d.node.js?key="123');
      expect(moduleResponse.statusCode).toBe(404);
    });

    it('returns a 500 if a request to proxy a module from the module map fails', async () => {
      expect.assertions(5);

      const fcdn = setupTest({
        useLocalModules: false,
        appPort: 3000,
        remoteModuleMapUrl: 'https://example.com/module-map.json',
      });
      fetch.mockReturnJsonOnce(defaultRemoteMap);
      fetch.mockReturnJsonOnce(new Error('Network error!'));
      const moduleMapResponse = await fcdn.inject()
        .get('/module-map.json');

      expect(moduleMapResponse.statusCode).toBe(200);
      expect(moduleMapResponse.headers['content-type']).toMatch(/^application\/json/);
      expect(
        sanitizeModuleMapForSnapshot(moduleMapResponse.body)
      ).toMatchSnapshot('module map response');
      expect(fetch.mock.calls).toEqual([
        [
          'https://example.com/module-map.json',
          {
            agent: expect.any(ProxyAgent),
          },
        ],
      ]);

      const moduleResponse = await fcdn.inject()
        .get('/cdn/module-b/1.0.0/module-b.node.js?key="123');
      expect(moduleResponse.statusCode).toBe(500);
    });

    it('returns a correct status code from proxy request', async () => {
      expect.assertions(1);

      const fcdn = setupTest({
        useLocalModules: false,
        appPort: 3000,
        remoteModuleMapUrl: 'https://example.com/module-map.json',
      });

      fetch.mockReturnJsonOnce(defaultRemoteMap);
      const gotError = new Error('Network error!');
      gotError.statusCode = 'ERR_NON_2XX_3XX_RESPONSE';
      gotError.response = { statusCode: 501 };

      await fcdn.inject()
        .get('/module-map.json');

      fetch.mockReturnFileOnce('body', 501);
      const moduleResponse = await fcdn.inject()
        .get('/cdn/module-b/1.0.0/some-langpack.json');
      expect(moduleResponse.statusCode).toBe(501);
    });
  });

  describe('production', () => {
    it('throws error when used in production', () => {
      process.env.NODE_ENV = 'production';
      console.error.mockClear();
      oneAppDevCdn({
        localDevPublicPath: mockLocalDevPublicPath,
        remoteModuleMapUrl: 'https://my-cdn-domain.com/map/module-map.json',
        appPort: 3000,
      });

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith('do not include one-app-dev-cdn in production');
    });
  });

  afterEach(() => {
    rimraf.sync(pathToCache);
    rimraf.sync(pathToStubs);
  });

  afterAll(() => {
    process.env.NODE_ENV = origNodeEnv;
  });
});

/* eslint-enable no-console -- because eslint-comments/disable-enable-pair */
