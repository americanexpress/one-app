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

import path from 'path';
import fs from 'fs';
import Intl from 'lean-intl';
import enData from 'lean-intl/locale-data/json/en.json';

import './init';
// Allow env config to run before importing holocron. (x2)
import ssrServer from './ssrServer';
import metricsServer from './metricsServer';
import listen from './listen';
import { addServer, shutdown } from './shutdown';
import pollModuleMap from './utils/pollModuleMap';
import loadModules from './utils/loadModules';

const ONE_APP_DEV_PROXY_PORT = process.env.HTTP_ONE_APP_DEV_PROXY_SERVER_PORT || 3002;

function ssrServerStart() {
  // need to load _some_ locale so that react-intl does not prevent modules from loading
  // eslint-disable-next-line no-underscore-dangle
  Intl.__addLocaleData(enData);
  return loadModules()
    .then(() => new Promise((res, rej) => {
      addServer(listen(ssrServer, (err, { port }) => {
        if (err) {
          rej(err);
        } else {
          console.log(`🌎 One App server listening on port ${port}`);
          res();
        }
      }));
    }))
    .then(pollModuleMap);
}

function metricsServerStart() {
  return new Promise((res, rej) => {
    const port = process.env.HTTP_METRICS_PORT || 3005;
    addServer(metricsServer.listen(port, (err) => (err ? rej(err) : res(port))));
  })
    .then(
      (port) => console.log(`📊 Metrics server listening on port ${port}`),
      (err) => {
        console.error('error encountered starting the metrics server', err);
        throw err;
      }
    );
}

function appServersStart() {
  return Promise.all([
    ssrServerStart(),
    metricsServerStart(),
  ]);
}

let serverChain;
if (process.env.NODE_ENV === 'development') {
  const pathToDevEndpoints = path.join(process.cwd(), '.dev', 'endpoints', 'index.js');

  const getRemotesFromDevEndpointsFile = () => {
    const moduleRemotes = {};
    if (fs.existsSync(pathToDevEndpoints)) {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      Object.values(require(pathToDevEndpoints)()).forEach(({ destination, devProxyPath }) => {
        moduleRemotes[devProxyPath] = destination;
      });
      return moduleRemotes;
    }
    return {};
  };

  /* eslint
    global-require: 0,
    import/no-extraneous-dependencies: ["error", {"devDependencies": true }]
  */
  const { argv } = require('yargs');

  const watchLocalModules = require('./utils/watchLocalModules').default;
  const devHolocronCDN = require('./devHolocronCDN').default;
  const oneAppDevProxy = require('@americanexpress/one-app-dev-proxy');
  const oneAppDevCdnPort = process.env.HTTP_ONE_APP_DEV_CDN_PORT || 3001;
  serverChain = Promise.resolve()
    .then(() => new Promise((res, rej) => addServer(
      devHolocronCDN.listen(oneAppDevCdnPort, (err) => {
        if (err) {
          rej(err);
        } else {
          console.log(`👕 one-app-dev-cdn server listening on port ${oneAppDevCdnPort}`);
          res();
        }
      })
    )))
    .then(() => new Promise((res, rej) => addServer(
      oneAppDevProxy({
        useMiddleware: argv.m,
        pathToMiddleware: path.join(__dirname, '../../.dev/middleware'),
        remotes: getRemotesFromDevEndpointsFile(),
      }).listen(ONE_APP_DEV_PROXY_PORT, (err) => {
        if (err) {
          rej(err);
        } else {
          console.log(`👖 one-app-dev-proxy server listening on port ${ONE_APP_DEV_PROXY_PORT}`);
          res();
        }
      })
    )))
    .then(appServersStart)
    .then(watchLocalModules);
} else {
  serverChain = appServersStart();
}

export default serverChain.catch((err) => {
  console.error(err);
  shutdown();
});
