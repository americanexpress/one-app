#!/usr/bin/env node

/*
 * Copyright 2020 American Express Travel Related Services Company, Inc.
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

const fs = require('fs-extra');
const path = require('path');
const { oneAppStaticsDir } = require('./utils');
const { version, contributors, license } = require('../package.json');

const pathToStaticsPackageJson = path.resolve(oneAppStaticsDir, 'package.json');

const writeStaticPackageJson = async () => {
  const staticsPackageJson = {
    name: '@americanexpress/one-app-statics',
    version,
    description: 'One App Static Assets',
    main: 'index.js',
    scripts: {
      postinstall: 'node postinstall.js',
    },
    license,
    contributors,
    homepage: 'https://github.com/americanexpress/one-app',
    bugs: { url: 'https://github.com/americanexpress/one-app/issues' },
  };
  await fs.writeFile(pathToStaticsPackageJson, JSON.stringify(staticsPackageJson, null, 2)
  );
};

writeStaticPackageJson().catch((e) => {
  console.error(`Error generating statics package.json: ${e}`);
  process.exit(1);
});
