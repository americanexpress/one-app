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

const path = require('path');
const rollup = require('rollup');
const resolve = require('@rollup/plugin-node-resolve');

async function buildServiceWorkerScripts({ minify = true, config = {} } = {}) {
  const inputDirectory = path.resolve(__dirname, '../src/client/sw');
  const buildFolderDirectory = path.resolve(__dirname, '../lib/server/middleware/pwa', 'scripts');

  const plugins = [
    {
      name: '@rollup/one-app-plugins/replace-osw-config',
      transform(code) {
        return {
          code: code.replace('process.env.OSW_CONFIG', JSON.stringify(config)),
        };
      },
    },
    resolve(),
  ];

  if (minify) {
    // eslint-disable-next-line global-require
    const { terser } = require('rollup-plugin-terser');
    plugins.push(terser());
  }

  const build = await rollup.rollup({
    input: {
      sw: path.join(inputDirectory, 'worker.js'),
      'sw.noop': path.join(inputDirectory, 'worker.noop.js'),
    },
    plugins,
  });

  return build.write({
    output: {
      format: 'esm',
      dir: buildFolderDirectory,
    },
  });
}

(async function buildWorkers() {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const { buildVersion } = require(path.resolve(__dirname, '../.build-meta.json'));

  const config = {
    buildVersion: buildVersion.replace(/(\.)/g, '\\$1'),
  };

  await buildServiceWorkerScripts({ config });
}());
