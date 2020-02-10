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

const fs = require('fs');
const bundle = require('../../../../bundle.integrity.manifest.json');
const { buildVersion } = require('../../../../.build-meta.json');

const bundleKeys = Object.keys(bundle);
const appFiles = bundleKeys.filter((route) => !route.startsWith('legacy')).reduce((map, route) => ({
  ...map,
  [route.replace('.js', '')]: [route, `${route}.map`],
}), {});

const intl = fs.readdirSync(`build/app/${buildVersion}/i18n`).reduce((map, lang) => {
  if (lang.endsWith('.map')) {
    map[`i18n/${lang.replace('.js.map', '')}`].push(`i18n/${lang}`);
  } else {
    return { ...map, [`i18n/${lang.replace('.js', '')}`]: [`i18n/${lang}`] };
  }
  return map;
}, {});

// eslint-disable-next-line prefer-arrow-callback
export default jest.fn(function readJsonFile(filePath) {
  switch (filePath.split('/').pop()) {
    case '.build-meta.json':
      return {
        buildVersion: '1.2.3-rc.4-abc123',
        modernBrowserChunkAssets: {
          ...intl,
          ...appFiles,
        },
        legacyBrowserChunkAssets: {
          ...intl,
          ...appFiles,
        },
      };
    case 'bundle.integrity.manifest.json':
      return bundle;
    default:
      throw new Error('Couldn\'t find JSON file to read');
  }
});
