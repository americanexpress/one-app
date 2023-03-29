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

/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true }] */

import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { argv } from 'yargs';
import oneAppDevCdn from '@americanexpress/one-app-dev-cdn';
import { register } from 'prom-client';

import { holocron as holocronMetrics } from './metrics';
import { getClientModuleMapCache } from './utils/clientModuleMapCache';

const hasLocalModuleMap = () => fs.existsSync(path.join(process.cwd(), 'static', 'module-map.json'));

async function calculateSuccessfulModuleMapLoads() {
  const clientModuleMapCache = getClientModuleMapCache();
  if (Object.keys(clientModuleMapCache).length < 1) {
    return 0;
  }

  const metric = await register.getSingleMetric(holocronMetrics.moduleMapUpdated).get();
  // single item in the array, no lables
  return metric.values[0].value + 1;
};

async function localModuleBundleNotFound(moduleIdentifier) {
  // same issue, different resolution suggestions based on scenario (starting up? already up?)
  const issueMessage = `cannot find the bundles for ${moduleIdentifier} on the local filesystem`;

  // if we don't have a successful 1st poll yet the server needs to close with an error
  const moduleMapLoads = await calculateSuccessfulModuleMapLoads();

  if (moduleMapLoads === 0) {
    console.error(`${issueMessage}, you probably need to build the module`);
    // end the startup to avoid confusing behavior
    // the user controls their local disk so can resolve the need to build
    // TODO: can we wait until the first load attempt finishes? so the user can see all the modules they need to build at once, rather than iteratively
    process.exit(2);
  }

  console.error(`${issueMessage}, it may be in the middle of a build or the build is failing`);
}

const app = express();

app.use(cors());
app.use('/static', oneAppDevCdn({
  localDevPublicPath: path.join(__dirname, '../../static'),
  remoteModuleMapUrl: argv.moduleMapUrl,
  useLocalModules: hasLocalModuleMap(),
  appPort: process.env.HTTP_PORT,
  useHost: argv.useHost,

  hooks: {
    localModuleBundleNotFound,
  },
}));

export default app;
