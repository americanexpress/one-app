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

import { Set as iSet } from 'immutable';
import uuid from 'uuid/v4';

import jsonStringifyForScript from './jsonStringifyForScript';
import getI18nFileFromState from './getI18nFileFromState';
import readJsonFile from './readJsonFile';
import { getClientModuleMapCache } from './clientModuleMapCache';
import { serializeClientInitialState } from './serializers';

const integrityManifest = readJsonFile('../../../bundle.integrity.manifest.json');

export function renderScriptTag(src, attrs = [], body = '') {
  if (src) attrs.unshift(`src="${src}"`);
  return `<script${[
    attrs.length > 0 ? ' ' : '',
    attrs.join(' ').trim(),
  ].join('')}>${body ? `\n${body}\n` : ''}</script>`;
}

export function renderInitialStateScriptTag({
  id = 'initial-state',
  isStatic = false,
  scriptNonce,
  publicPath,
  bundle,
  moduleMap: __CLIENT_HOLOCRON_MODULE_MAP__,
  initialState: __INITIAL_STATE__,
}) {
  const initialStateMap = {
    __render_mode__: `'${isStatic ? 'render' : 'hydrate'}'`,
    __webpack_public_path__: publicPath,
    __holocron_module_bundle_type__: `'${bundle}'`,
    __CLIENT_HOLOCRON_MODULE_MAP__,
    __INITIAL_STATE__,
  };

  return renderScriptTag(
    null,
    [`id="${id}"`, scriptNonce ? `nonce="${scriptNonce}"` : ''],
    Object.keys(initialStateMap)
      .map((key) => `\twindow.${key} = ${initialStateMap[key]};`)
      .join('\n')
  );
}

export function getModules(modules, moduleMap, rootModuleName) {
  // Sorting to ensure that the rootModule is the first script to load,
  // this is required to correctly provide external dependencies.
  return modules
    .sort((currentModule, nextModule) => {
      if (currentModule === rootModuleName) {
        return -1;
      }
      if (nextModule === rootModuleName) {
        return 1;
      }
      return 0;
    })
    .map((moduleName) => [moduleMap.modules[moduleName], moduleName])
    .toJS();
}


function getChunkAssets(assetsByChunkName) {
  // console.log(assetsByChunkName);
  return (
    Object.entries(assetsByChunkName)
      // i18n is different per request, app needs to be the last chunk loaded
      .filter(
        ([chunkName]) => chunkName !== 'app'
          && /^(i18n)/g.test(chunkName) === false
      )
      .map(([, assets]) => (typeof assets === 'string' ? assets : assets[0]))
  );
}

export const modernBrowserChunkAssets = getChunkAssets(
  readJsonFile('../../../.build-meta.json').modernBrowserChunkAssets
);
export const legacyBrowserChunkAssets = getChunkAssets(
  readJsonFile('../../../.build-meta.json').legacyBrowserChunkAssets
).map((chunkAsset) => `legacy/${chunkAsset}`);

export function renderChunkAssetScripts({
  legacy,
  publicPath,
  crossOrigin,
  integrity,
}) {
  const chunkAssets = legacy ? legacyBrowserChunkAssets : modernBrowserChunkAssets;
  return chunkAssets
    .map((chunkAsset) => renderScriptTag(`${publicPath}/${chunkAsset}`, [
      integrity ? `integrity="${integrityManifest[chunkAsset]}"` : '',
      crossOrigin ? `crossorigin="${crossOrigin}"` : '',
    ]))
    .join('\n');
}

export function renderI18nScript({
  clientInitialState, publicPath, crossOrigin,
}) {
  const i18nFile = getI18nFileFromState(clientInitialState);
  if (!i18nFile) {
    return '';
  }

  return renderScriptTag(`${publicPath}/${i18nFile}`, [
    crossOrigin ? `crossorigin="${crossOrigin}"` : '',
  ]);
}

export function renderModuleScripts({
  clientInitialState,
  rootModuleName = clientInitialState.getIn(['config', 'rootModuleName'], ''),
  modules = clientInitialState.getIn(['holocron', 'loaded'], iSet()),
  moduleMap,
  bundle,
  devMode,
  crossOrigin,
}) {
  return getModules(modules, moduleMap[bundle], rootModuleName)
    .map(
      ([
        {
          [bundle]: { integrity, url: src },
        },
      ]) => {
        const { key } = moduleMap[bundle];
        return renderScriptTag(devMode ? src : `${src}?key=${key}`, [
          crossOrigin ? `crossorigin="${crossOrigin}"` : '',
          devMode ? '' : `integrity="${integrity}"`,
        ]);
      }
    )
    .join('\n');
}

// eslint-disable-next-line complexity
export function renderScripts({
  devMode = false,
  legacy = false,
  isStatic = false,
  crossOrigin = 'anonymous',
  publicPath = '/_/static',
  scriptNonce = uuid(),
  clientInitialState = null,
  rootModuleName = clientInitialState && clientInitialState.getIn(['config', 'rootModuleName'], 'root'),
  clientModuleMapCache = getClientModuleMapCache(),
} = {}) {
  if (!clientInitialState) throw new Error('clientInitialState is required to render scripts');
  // if (!rootModuleName) throw new Error('rootModuleName is required to render scripts');

  const bundle = legacy ? 'legacyBrowser' : 'browser';
  const bundlePrefixForBrowser = legacy ? `${publicPath}/legacy` : publicPath;

  const renderedState = renderInitialStateScriptTag({
    isStatic,
    scriptNonce,
    bundle,
    publicPath: publicPath ? jsonStringifyForScript(publicPath.endsWith('/') ? publicPath : `${publicPath}/`) : '',
    moduleMap: clientModuleMapCache ? jsonStringifyForScript(clientModuleMapCache[bundle]) : '{}',
    initialState: jsonStringifyForScript(serializeClientInitialState(clientInitialState)),
  });
  const assets = publicPath ? renderChunkAssetScripts({
    legacy,
    publicPath,
    crossOrigin,
    integrity: !devMode,
  }) : '';
  const i18n = publicPath ? renderI18nScript({
    clientInitialState,
    crossOrigin,
    publicPath: bundlePrefixForBrowser,
    integrity: !devMode,
  }) : '';
  const moduleScripts = clientModuleMapCache ? renderModuleScripts({
    clientInitialState,
    moduleMap: clientModuleMapCache,
    devMode,
    bundle,
    crossOrigin,
    rootModuleName,
  }) : '';
  const appScript = publicPath ? renderScriptTag(`${bundlePrefixForBrowser}/app.js`, [
    !devMode ? `integrity="${integrityManifest[legacy ? 'legacy/app.js' : 'app.js']}"` : '',
    crossOrigin ? `crossorigin="${crossOrigin}"` : '',
  ]) : '';

  return [renderedState, assets, i18n, moduleScripts, appScript].filter((str) => !!str).join('\n');
}
