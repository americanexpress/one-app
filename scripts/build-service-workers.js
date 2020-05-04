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
const babel = require('rollup-plugin-babel');

async function buildServiceWorkerScripts({ dev = false, minify = true } = {}) {
  const inputDirectory = path.resolve(__dirname, '../src/client/service-worker');
  const buildFolderDirectory = path.resolve(__dirname, '../lib/server/middleware/pwa', 'scripts');

  const plugins = [
    resolve(),
    babel(),
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
      sourcemap: dev ? 'inline' : false,
    },
  });
}

(async function buildWorkers({ dev }) {
  await buildServiceWorkerScripts({ dev });
}({
  // for environment variables
  dev: process.env.NODE_ENV === 'development',
}));
