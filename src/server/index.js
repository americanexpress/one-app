/* eslint-disable global-require */
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

import util from 'node:util';
import path from 'path';
import fs from 'fs';
import Intl from 'lean-intl';
import enData from 'lean-intl/locale-data/json/en.json';

import './init';
// Allow env config to run before importing holocron. (x2)
import ssrServer from './ssrServer';
import metricsServer from './metricsServer';
import { addServer, shutdown } from './shutdown';
import pollModuleMap from './utils/pollModuleMap';
import loadModules from './utils/loadModules';
import getHttpsConfig from './utils/getHttpsConfig';
/*    🛠️ UTILITIES 🛠️    */

const getRemotesFromDevEndpointsFile = () => {
  const pathToDevEndpoints = path.join(process.cwd(), '.dev', 'endpoints', 'index.js');

  return fs.existsSync(pathToDevEndpoints)
    // eslint-disable-next-line global-require,import/no-dynamic-require
    ? Object.values(require(pathToDevEndpoints)()).reduce(
      (moduleRemotes, { destination, devProxyPath }) => ({
        ...moduleRemotes,
        [devProxyPath]: destination,
      }),
      {})
    : {};
};

export const listen = async ({
  context,
  instance,
  port,
  host,
}) => {
  try {
    await instance.listen({
      host: host || '0.0.0.0',
      port,
    });

    console.log('%s listening on port %d', context, port);

    addServer(instance);

    return instance;
  } catch (error) {
    console.error('Error encountered starting %s', context, error);
    throw error;
  }
};

/*    🚀 STARTERS 🚀    */

async function ssrServerStart() {
  // need to load _some_ locale so that react-intl does not prevent modules from loading
  // eslint-disable-next-line no-underscore-dangle
  Intl.__addLocaleData(enData);

  await loadModules();

  const isHttps = !!process.env.HTTPS_PORT;
  const port = isHttps ? process.env.HTTPS_PORT : process.env.HTTP_PORT || 3000;

  await listen({
    context: '🌎 One App server',
    instance: await ssrServer({
      https: isHttps ? getHttpsConfig() : null,
    }),
    host: process.env.IP_ADDRESS,
    port,
  });

  await pollModuleMap();

  if (process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT) {
    process.stdout.write(util.format('\none-app started successfully. Logs are being sent to OTel via gRPC at %s\n', process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT));
  }
}

async function metricsServerStart() {
  const port = process.env.HTTP_METRICS_PORT;

  await listen({
    context: '📊 Metrics server',
    instance: await metricsServer(),
    port,
  });
}

async function devHolocronCDNStart() {
  const devHolocronCDN = require('./devHolocronCDN').default;
  const oneAppDevCdnPort = process.env.HTTP_ONE_APP_DEV_CDN_PORT;

  await listen({
    context: '👕 one-app-dev-cdn server',
    instance: await devHolocronCDN(),
    port: oneAppDevCdnPort,
  });
}

async function oneAppDevProxyStart() {
  const { argv } = require('yargs');
  const oneAppDevProxyPort = process.env.HTTP_ONE_APP_DEV_PROXY_SERVER_PORT;
  // eslint-disable-next-line import/no-extraneous-dependencies
  const oneAppDevProxy = require('@americanexpress/one-app-dev-proxy').default;
  const instance = oneAppDevProxy({
    useMiddleware: argv.m,
    pathToMiddleware: path.join(__dirname, '../../.dev/middleware'),
    remotes: getRemotesFromDevEndpointsFile(),
  });

  // Note: this will be moved to Fastify once @americanexpress/one-app-dev-proxy is moved to Fastify
  await new Promise((res, rej) => {
    addServer(instance.listen(oneAppDevProxyPort, (err) => {
      if (err) {
        rej(err);
      } else {
        console.log('👖 one-app-dev-proxy server listening on port %d', oneAppDevProxyPort);
        res();
      }
    }));
  });
}

async function appServersStart() {
  await metricsServerStart();
  await ssrServerStart();
}

// INIT

const serverChain = process.env.NODE_ENV === 'development'
  ? Promise.resolve()
    .then(devHolocronCDNStart)
    .then(oneAppDevProxyStart)
    .then(appServersStart)
    .then(require('./utils/watchLocalModules').default)
  : appServersStart();

export default serverChain.catch((err) => {
  console.error(err);
  shutdown();
});
