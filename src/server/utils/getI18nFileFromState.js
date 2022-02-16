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

import readJsonFile from './readJsonFile';

// `require` has a cache, avoid retaining the full file in memory
const { modernBrowserChunkAssets: assetsByChunkName } = readJsonFile('../../../.build-meta.json');

const i18nFiles = new Map(
  Object
    .entries(assetsByChunkName)
    .filter(([name]) => name.startsWith('i18n/'))
    .map(([chunkName, assets]) => {
      const localeName = chunkName.replace(/^i18n\//, '');
      const localeAsset = Array.isArray(assets) ? assets.filter((asset) => !asset.endsWith('.map'))[0] : assets;
      return [localeName, localeAsset];
    })
);

function getI18nFileFromState(clientInitialState) {
  const activeLocale = clientInitialState.getIn(['intl', 'activeLocale']);

  if (i18nFiles.has(activeLocale)) {
    return i18nFiles.get(activeLocale);
  }

  // use the language without further refinement (ex: 'en' for 'en-SA')
  const localeArray = activeLocale.split('-');
  // adapted from one-app-ducks src/intl/index.js getLocalePack()
  while (localeArray.length > 0) {
    if (i18nFiles.has(localeArray.join('-'))) {
      return i18nFiles.get(localeArray.join('-'));
    }
    localeArray.pop();
  }

  return null;
}

export default getI18nFileFromState;
