/*
 * Copyright 2022 American Express Travel Related Services Company, Inc.
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

// This file is only used in development so imports should be devDeps unless used elsewhere
/* eslint "import/no-extraneous-dependencies": ["error", {"devDependencies": true}] -- see above */

import path from 'node:path';
import fs from 'node:fs';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { ProxyAgent } from 'proxy-agent';
import { getIp } from './getIP';
import logger from './logging/logger';

import { getCachedModuleFiles, writeToCache, removeExistingEntryIfConflicting } from './cdnCache';

let cachedModuleFiles = getCachedModuleFiles();

const getLocalModuleMap = ({ pathToModuleMap, oneAppDevCdnAddress }) => {
  const moduleMap = JSON.parse(fs.readFileSync(pathToModuleMap, 'utf8').toString());
  Object.keys(moduleMap.modules).forEach((moduleName) => {
    const module = moduleMap.modules[moduleName];
    Object
      .values(module)
      .filter((bundle) => Object.hasOwnProperty.call(bundle, 'url'))
      .forEach((bundle) => {
        /* eslint-disable-next-line no-param-reassign -- the in-memory copy is created here during
        // the read from disk, so the replacement side-effect of this loop is local to the
        // getLocalModuleMap function and not to any arguments */
        bundle.url = bundle.url.replace('[one-app-dev-cdn-url]', oneAppDevCdnAddress);
      });
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
    console.warn('one-app-dev-cdn error loading module map from %s:', remoteModuleMapUrl, error);
    return {};
  }
};

export const oneAppDevCdnFactory = ({
  localDevPublicPath,
  remoteModuleMapUrl,
  useLocalModules,
  appPort,
  useHost,
  routePrefix = '',
}) => {
  if (!remoteModuleMapUrl && !useLocalModules) {
    throw new Error('remoteModuleMapUrl is a required param when useLocalModules is not true');
  }
  if (!localDevPublicPath) { throw new Error('localDevPublicPath is a required param'); }
  if (!appPort) { throw new Error('appPort is a required param'); }

  if (remoteModuleMapUrl) {
    console.log('one-app-dev-cdn loading module map from %s', remoteModuleMapUrl);
  } else {
    console.log('one-app-dev-cdn only using locally served modules');
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('do not include one-app-dev-cdn in production');
  }

  const oneAppDevCdn = Fastify({ logger, disableRequestLogging: true });
  oneAppDevCdn.register(compress, {
    global: false,
  });
  oneAppDevCdn.register(cors, {
    origin: [
      `http://localhost:${appPort}`,
      `http://${getIp()}:${appPort}`,
      undefined,
    ],
  });

  // for locally served modules
  oneAppDevCdn.register(fastifyStatic, {
    root: `${localDevPublicPath}/modules`,
    prefix: `${routePrefix}/modules`,
    index: false,
  });

  const remoteModuleBaseUrls = [];
  // support one-app-cli's "serve-module"
  // merge local with remote, with local taking preference
  oneAppDevCdn.get(`${routePrefix}/module-map.json`, async (req, reply) => {
    const hostAddress = useHost ? `http://${req.headers.host}` : `http://localhost:${process.env.HTTP_ONE_APP_DEV_CDN_PORT}`;
    const localMap = useLocalModules ? JSON.parse(getLocalModuleMap({
      pathToModuleMap: path.join(localDevPublicPath, 'module-map.json'),
      oneAppDevCdnAddress: hostAddress,
    })) : {};

    const remoteMap = remoteModuleMapUrl != null
      ? await consumeRemoteRequest(remoteModuleMapUrl, hostAddress, remoteModuleBaseUrls)
      : {};
    // remoteMap always fulfilled
    const map = {
      ...remoteMap,
      key: 'not-used-in-development',
      modules: {
        ...remoteMap.modules,
        ...localMap.modules,
      },
    };
    reply
      .code(200)
      .send(map);
  });

  oneAppDevCdn.get('*', async (req, reply) => {
    const incomingRequestPath = req.url.replace('/static', '');
    const knownRemoteModuleBaseUrl = matchPathToKnownRemoteModuleUrl(
      incomingRequestPath,
      remoteModuleBaseUrls
    );
    if (knownRemoteModuleBaseUrl) {
      const remoteModuleBaseUrlOrigin = new URL(knownRemoteModuleBaseUrl).origin;
      if (cachedModuleFiles[incomingRequestPath]) {
        return reply
          .code(200)
          .type('application/json')
          .send(cachedModuleFiles[incomingRequestPath]);
      }

      const remoteModuleResponse = await fetch(`${remoteModuleBaseUrlOrigin}${incomingRequestPath}`, {
        headers: { connection: 'keep-alive' },
        agent: new ProxyAgent(),
      });
      const { status, type } = remoteModuleResponse;
      const responseText = await remoteModuleResponse.text();
      if (status === 200) {
        cachedModuleFiles = removeExistingEntryIfConflicting(
          incomingRequestPath,
          cachedModuleFiles
        );
        cachedModuleFiles[incomingRequestPath] = responseText;
        writeToCache(cachedModuleFiles);
      }
      return reply.code(status).type(type).send(responseText);
    }
    return reply.code(404).send('Not Found');
  });

  return oneAppDevCdn;
};

export default oneAppDevCdnFactory;
