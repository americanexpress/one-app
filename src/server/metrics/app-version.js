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

import semverParse from 'semver/functions/parse';
import { createGauge, setGauge } from './gauges';
import createMetricNamespace from './create-metric-namespace';
import readJsonFile from '../utils/readJsonFile';

const { buildVersion: version } = readJsonFile('../../../.build-meta.json');
const versionNamespace = createMetricNamespace('version');

createGauge({
  name: versionNamespace('info'),
  labelNames: ['version', 'major', 'minor', 'patch', 'prerelease', 'build'],
  help: 'One App version info',
});

// keep the parsing in a local variable to avoid keeping it in memory forever
function parseVersionAndSetGaugue() {
  // semver expects build to be qualified with '+'
  // current version of one app bundler appends build with '-'
  const parts = version.split('-');
  const build = parts.pop();
  const {
    major, minor, patch, prerelease,
  } = semverParse(parts.join('-'));

  setGauge(versionNamespace.getMetricNames().info, {
    version,
    major,
    minor,
    patch,
    prerelease: prerelease.join('.') || null,
    build,
  }, 1);
}
parseVersionAndSetGaugue();

export default versionNamespace.getMetricNames();
