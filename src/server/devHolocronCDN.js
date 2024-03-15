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

/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true }] --
 * this file is only loaded in development */

import path from 'path';
import fs from 'fs';
import { argv } from 'yargs';
import oneAppDevCdn from './utils/devCdnFactory';

const hasLocalModuleMap = () => fs.existsSync(path.join(process.cwd(), 'static', 'module-map.json'));

const devHolocronCDN = async () => {
  const fastify = await oneAppDevCdn({
    localDevPublicPath: path.join(__dirname, '../../static'),
    remoteModuleMapUrl: argv.moduleMapUrl,
    useLocalModules: hasLocalModuleMap(),
    appPort: process.env.HTTP_PORT,
    useHost: argv.useHost,
    routePrefix: '/static',
  });

  return fastify;
};

export default devHolocronCDN;
