/* eslint-disable import/no-extraneous-dependencies */
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

// native
import path from 'path';
import fs from 'fs';

// dependencies
import express from 'express';
import fetch from 'node-fetch';
import compression from 'compression';
import cors from 'cors';
import ip from 'ip';
import ProxyAgent from 'proxy-agent';
import { getCachedModules, writeToCache, removeDuplicatedModules } from './cdnCache';

let moduleNames = [];
const cachedModules = getCachedModules();

const getLocalModuleMap = ({ pathToModuleMap, oneAppDevCdnAddress }) => {
  const moduleMap = JSON.parse(fs.readFileSync(pathToModuleMap, 'utf8').toString());
  Object.keys(moduleMap.modules).forEach((moduleName) => {
    const module = moduleMap.modules[moduleName];
    module.browser.url = module.browser.url.replace('[one-app-dev-cdn-url]', oneAppDevCdnAddress);
    module.legacyBrowser.url = module.legacyBrowser.url.replace('[one-app-dev-cdn-url]', oneAppDevCdnAddress);
    module.node.url = module.node.url.replace('[one-app-dev-cdn-url]', oneAppDevCdnAddress);
  });
  return JSON.stringify(moduleMap, null, 2);
};

const matchPathToKnownRemoteModuleUrl = (
  incomingRequestPath,
  remoteModuleBaseUrls
) => remoteModuleBaseUrls.find((remoteModuleBaseUrl) => {
  const remoteModuleUrlOrigin = new URL(remoteModuleBaseUrl).origin;
  const remoteModulePath = remoteModuleBaseUrl.replace(remoteModuleUrlOrigin, '');

  return incomingRequestPath.startsWith(remoteModulePath);
});

const consumeRemoteRequest = async (remoteModuleMapUrl, hostAddress, remoteModuleBaseUrls) => {
  try {
    const response = await fetch(remoteModuleMapUrl, {
      agent: new ProxyAgent(),
    });
      // clear out remoteModuleBaseUrls as the new module map now has different urls in it
      // not clearing would result in an ever growing array
    remoteModuleBaseUrls.splice(0, remoteModuleBaseUrls.length);
    const remoteModuleMap = await response.json();
    const { modules } = remoteModuleMap;
    const oneAppDevStaticsAddress = `${hostAddress}/static`;
    Object.keys(modules).map((moduleName) => {
      const module = modules[moduleName];
      const parsedBundlePath = path.parse(module.node.url, '');
      // store urls for later lookup when module requests are caught by one-app-dev-cdn
      remoteModuleBaseUrls.push(
        module.node.url.replace(parsedBundlePath.base, '')
      );
      // override remote module map to point all module URLs to one-app-dev-cdn
      module.node.url = module.node.url.replace(
        new URL(module.node.url).origin, oneAppDevStaticsAddress
      );
      module.legacyBrowser.url = module.legacyBrowser.url.replace(
        new URL(module.legacyBrowser.url).origin, oneAppDevStaticsAddress
      );
      module.browser.url = module.browser.url.replace(
        new URL(module.browser.url).origin, oneAppDevStaticsAddress
      );
      return module;
    });
    return remoteModuleMap;
  } catch (error) {
    console.warn(
      `one-app-dev-cdn error loading module map from ${remoteModuleMapUrl}: ${error}`
    );
    return {};
  }
};
const oneAppDevCdnFactory = ({
  localDevPublicPath,
  remoteModuleMapUrl,
  useLocalModules,
  appPort,
  useHost,
}) => {
  if (!remoteModuleMapUrl && !useLocalModules) {
    throw new Error('remoteModuleMapUrl is a required param when useLocalModules is not true');
  }
  if (!localDevPublicPath) { throw new Error('localDevPublicPath is a required param'); }
  if (!appPort) { throw new Error('appPort is a required param'); }

  if (remoteModuleMapUrl) {
    console.log(`one-app-dev-cdn loading module map from ${remoteModuleMapUrl}`);
  } else {
    console.log('one-app-dev-cdn only using locally served modules');
  }

  const oneAppDevCdn = express();

  if (process.env.NODE_ENV === 'production') {
    console.warn('do not include one-app-dev-cdn in production');
    return oneAppDevCdn;
  }

  oneAppDevCdn.disable('x-powered-by');

  oneAppDevCdn.use(compression());

  oneAppDevCdn.use(cors({
    origin: [
      `http://localhost:${appPort}`,
      `http://${ip.address()}:${appPort}`,
      undefined,
    ],
  }));

  const remoteModuleBaseUrls = [];
  // support one-app-cli's "serve-module"
  // merge local with remote, with local taking preference
  oneAppDevCdn.get('/module-map.json', async (req, response) => {
    const hostAddress = useHost ? `http://${req.headers.host}` : `http://localhost:${process.env.HTTP_ONE_APP_DEV_CDN_PORT}`;
    const localMap = useLocalModules ? JSON.parse(getLocalModuleMap({
      pathToModuleMap: path.join(localDevPublicPath, 'module-map.json'),
      oneAppDevCdnAddress: hostAddress,
    })) : {};
    const remoteMap = remoteModuleMapUrl != null
      ? await consumeRemoteRequest(remoteModuleMapUrl, hostAddress, remoteModuleBaseUrls)
      : {};
    // remoteMap always fulfilled
    const modules = { ...remoteMap.modules, ...localMap.modules };
    const map = {
      ...remoteMap,
      key: 'not-used-in-development',
      modules,
    };
    moduleNames = Object.keys(modules);
    response
      .status(200)
      .send(map);
  });

  // for locally served modules
  oneAppDevCdn.use('/modules', express.static(`${localDevPublicPath}/modules`));

  // eslint-disable-next-line consistent-return -- not needed
  oneAppDevCdn.get('*', async (req, res) => {
    const incomingRequestPath = req.path;

    if (matchPathToKnownRemoteModuleUrl(incomingRequestPath, remoteModuleBaseUrls)) {
      const knownRemoteModuleBaseUrl = matchPathToKnownRemoteModuleUrl(
        incomingRequestPath,
        remoteModuleBaseUrls
      );
      const remoteModuleBaseUrlOrigin = new URL(knownRemoteModuleBaseUrl).origin;

      if (cachedModules[incomingRequestPath]) {
        return res
          .status(200)
          .type('application/javascript')
          .send(cachedModules[incomingRequestPath]);
      }
      try {
        const remoteModuleResponse = await fetch(`${remoteModuleBaseUrlOrigin}/${req.path}`, {
          headers: { connection: 'keep-alive' },
          agent: new ProxyAgent(),
        });
        const { status, type } = remoteModuleResponse;
        const repsonseText = remoteModuleResponse.text();
        const updatedCachedModules = removeDuplicatedModules(
          incomingRequestPath,
          cachedModules,
          moduleNames
        );
        updatedCachedModules[incomingRequestPath] = repsonseText;
        writeToCache(updatedCachedModules);
        return res
          .status(status)
          .type(type)
          .send(repsonseText);
      } catch (error) {
        const status = error.code === 'ERR_NON_2XX_3XX_RESPONSE' ? error.response.statusCode : 500;
        return res
          .status(status)
          .send(error.message);
      }
    } else {
      res
        .status(404)
        .send('Not found');
    }
  });

  return oneAppDevCdn;
};

export default oneAppDevCdnFactory;
