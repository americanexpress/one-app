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

// This rule is only needed for a couple functions below
/* eslint-disable es/no-arrow-functions */
import { matchesUA } from 'browserslist-useragent';
import { browserList } from 'babel-preset-amex/browserlist';
import { Set as iSet, Map as iMap } from 'immutable';

import transit from '../../universal/utils/transit';
import { setConfig } from '../../universal/ducks/config';
import jsonStringifyForScript from '../utils/jsonStringifyForScript';
import { getClientStateConfig } from '../utils/stateConfig';
import getI18nFileFromState from '../utils/getI18nFileFromState';
import renderModuleStyles from '../utils/renderModuleStyles';
import readJsonFile from '../utils/readJsonFile';
import { getClientPWAConfig } from './pwa';

const { buildVersion } = readJsonFile('../../../.build-meta.json');
const integrityManifest = readJsonFile('../../../bundle.integrity.manifest.json');
const nodeEnvIsDevelopment = process.env.NODE_ENV === 'development';

function getChunkAssets(assetsByChunkName) {
  return Object
    .entries(assetsByChunkName)
    // i18n is different per request, app needs to be the last chunk loaded
    .filter(([chunkName]) => !chunkName.startsWith('i18n/') && chunkName !== 'app')
    .map(([, assets]) => (typeof assets === 'string' ? assets : assets[0]));
}

const modernBrowserChunkAssets = getChunkAssets(readJsonFile('../../../.build-meta.json').modernBrowserChunkAssets);
const legacyBrowserChunkAssets = getChunkAssets(readJsonFile('../../../.build-meta.json').legacyBrowserChunkAssets)
  .map((chunkAsset) => `legacy/${chunkAsset}`);

export function safeSend(res, ...payload) {
  if (!res.headersSent) {
    res.send(...payload);
  }
}

export function renderStaticErrorPage(res) {
  if (!res.statusCode) {
    res.status(500);
  }
  console.info(`renderStaticErrorPage status ${res.statusCode}`);

  let message = 'Sorry, we are unable to load this page at this time. Please try again later.';
  if (res.statusCode >= 400 && res.statusCode < 500 && res.statusCode !== 404) {
    // issue is with the request, retrying won't change the server response
    message = 'Sorry, we are unable to load this page at this time.';
  }

  // TODO: allow root module to provide custom error message and override default html
  safeSend(res,
    `<!DOCTYPE html>
        <html>
          <head>
            <title>One App</title>
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta name="application-name" content="one-app">
          </head>
          <body style="background-color: #F0F0F0">
            <div id="root">
              <div>
                <div style="width: 70%; background-color: white; margin: 4% auto;">
                  <h2 style="display: flex; justify-content: center; padding: 40px 15px 0px;">Loading Error</h2>
                  <p style="display: flex; justify-content: center; padding: 10px 15px 40px;">
                    ${message}
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>`);
}

function renderI18nScript(clientInitialState, appBundlesURLPrefix) {
  const i18nFile = getI18nFileFromState(clientInitialState);
  if (!i18nFile) {
    return '';
  }

  return `<script src="${appBundlesURLPrefix}/${i18nFile}" crossorigin="anonymous"></script>`;
}

export function renderModuleScripts({
  clientInitialState, moduleMap, isDevelopmentEnv, bundle,
}) {
  const clientConfig = getClientStateConfig();
  const { rootModuleName } = clientConfig;
  // Sorting to ensure that the rootModule is the first script to load,
  // this is required to correctly provide external dependencies.
  const orderedLoadedModules = clientInitialState.getIn(['holocron', 'loaded'], iSet())
    .sort((currentModule, nextModule) => {
      if (currentModule === rootModuleName) { return -1; }
      if (nextModule === rootModuleName) { return 1; }
      return 0;
    });

  return orderedLoadedModules.map((moduleName) => {
    const { integrity, url: src } = moduleMap.modules[moduleName][bundle];
    const { clientCacheRevision } = moduleMap;
    const additionalAttributes = isDevelopmentEnv ? '' : `integrity="${integrity}"`;
    const scriptSource = isDevelopmentEnv || !clientCacheRevision ? src : `${src}?clientCacheRevision=${clientCacheRevision}`;
    return `<script src="${scriptSource}" crossorigin="anonymous" ${additionalAttributes}></script>`;
  }).join(isDevelopmentEnv ? '\n          ' : '');
}

function serializeClientInitialState(clientInitialState) {
  // try to build the full state, this _might_ fail (ex: 'Error serializing unrecognized object')
  try {
    return transit.toJSON(clientInitialState);
  } catch (err) {
    console.error('encountered an error serializing full client initial state', err);

    // clear out an internal cache that corrupts the serialization generated on the next call
    // TODO: understand transit-js and transit-immutable-js internals to properly fix the bug
    // for now stop the bleeding
    transit.toJSON('clear out an internal cache');
  }

  // can't send all the work we've done to build the state, but we can still give the app what it
  // needs to start in the browser
  // this _shouldn't_ ever throw, but just in case...
  try {
    return transit.toJSON(iMap({
      config: clientInitialState.get('config'),
      holocron: clientInitialState.get('holocron'),
    }));
  } catch (err) {
    transit.toJSON('clear out an internal cache, again');
    // something is really wrong
    console.error('unable to build the most basic initial state for a client to startup', err);
    throw err;
  }
}

function getHelmetData(data, fallback = '') {
  return (data && data.toString()) || fallback;
}

function getHelmetString(helmetInfo, disableStyles) {
  const {
    title, meta, style, link, base,
  } = helmetInfo;

  let linkText = getHelmetData(link);

  // filter only stylesheets
  if (linkText && disableStyles) {
    linkText = linkText.match(/<[^>]+>/g)
      .filter((match) => !match.includes('rel="stylesheet"'))
      .join('');
  }

  const styleText = disableStyles ? '' : getHelmetData(style);

  return `
${getHelmetData(title, '<title>One App</title>')}
${getHelmetData(meta)}
${styleText}
${linkText}
${getHelmetData(base)}
  `;
}

export function getHtmlAttributesString(helmetInfo) {
  const { htmlAttributes } = helmetInfo;
  return (htmlAttributes && ` ${htmlAttributes.toString()}`) || '';
}

export function getHead({
  helmetInfo,
  store,
  disableStyles,
}) {
  return `
    <head>
      ${getHelmetString(helmetInfo, disableStyles)}
      ${disableStyles ? '' : `
      ${renderModuleStyles(store)}
      `}
    </head>
  `;
}

export function getBody({
  isLegacy,
  helmetInfo,
  assets,
  appHtml,
  appBundlesURLPrefix,
  clientInitialState,
  disableScripts,
  clientModuleMapCache,
  scriptNonce,
  pwaMetadata,
}) {
  const bundle = isLegacy ? 'legacyBrowser' : 'browser';
  const { bodyAttributes, script } = helmetInfo;
  const bundlePrefixForBrowser = isLegacy ? `${appBundlesURLPrefix}/legacy` : appBundlesURLPrefix;
  return `
    <body${(bodyAttributes && ` ${bodyAttributes.toString()}`) || ''}>
      <div id="root">${appHtml || ''}</div>
      ${disableScripts ? '' : `
      <script id="initial-state" ${scriptNonce ? `nonce="${scriptNonce}"` : ''}>
        window.__webpack_public_path__ = ${jsonStringifyForScript(`${appBundlesURLPrefix}/`)};
        window.__CLIENT_HOLOCRON_MODULE_MAP__ = ${jsonStringifyForScript(clientModuleMapCache[bundle])};
        window.__INITIAL_STATE__ = ${jsonStringifyForScript(serializeClientInitialState(clientInitialState))};
        window.__holocron_module_bundle_type__ = '${bundle}';
        window.__pwa_metadata__ = ${jsonStringifyForScript(pwaMetadata)};
      </script>
      ${assets}
      ${renderI18nScript(clientInitialState, bundlePrefixForBrowser)}
      ${renderModuleScripts({
    clientInitialState,
    moduleMap: clientModuleMapCache[bundle],
    isDevelopmentEnv: nodeEnvIsDevelopment,
    bundle,
  })}
      <script src="${bundlePrefixForBrowser}/app.js" integrity="${integrityManifest[isLegacy ? 'legacy/app.js' : 'app.js']}" crossorigin="anonymous"></script>
      ${(script && script.toString()) || ''}
      `}
    </body>
  `;
}

export function renderPartial({
  html: initialHtml,
  store,
}) {
  let html = initialHtml;
  // The partial route is commonly used for HTML partials, however email rendering requires
  // generating the entire document (including the <!doctype>), not just a portion of a document.
  // As Fragments cannot use dangerouslySetInnerHTML an outer element is required, but not desired.
  // In the final content body, we use `<dangerously-return-only-doctype>`.
  if (
    initialHtml.match(/^<dangerously-return-only-doctype>\s*<!doctype html>/)
    && initialHtml.match(/<\/html>\s*<\/dangerously-return-only-doctype>$/)
  ) {
    html = initialHtml
      .replace(/^<dangerously-return-only-doctype>/, '')
      .replace(/<\/dangerously-return-only-doctype>$/, '');
  }

  const styles = renderModuleStyles(store);

  if (html.startsWith('<!doctype html>')) {
    return html.replace('</head>', `${styles}</head>`);
  }

  return styles + html;
}

// TODO add additional client side scripts
export default function sendHtml(req, res) {
  let body;
  try {
    const {
      appHtml, clientModuleMapCache, store, headers, helmetInfo = {},
    } = req;
    const { scriptNonce } = res;
    const userAgent = headers['user-agent'];
    const isLegacy = !matchesUA(userAgent, {
      browsers: browserList,
      allowHigherVersions: true,
    });

    console.info(`sendHtml, have store? ${!!store}, have appHtml? ${!!appHtml}`);
    if (appHtml && typeof appHtml !== 'string') {
      throw new Error(`appHtml was not a string, was ${typeof appHtml}`, appHtml);
    }
    // replace server specific config with client specific config (api urls and such)
    const clientConfig = getClientStateConfig();
    const pwaMetadata = getClientPWAConfig();
    store.dispatch(setConfig(clientConfig));
    const cdnUrl = clientConfig.cdnUrl || '/_/static/';
    const clientInitialState = store.getState();
    const appBundlesURLPrefix = `${cdnUrl}app/${buildVersion}`;

    const disableScripts = clientInitialState.getIn(['rendering', 'disableScripts']);
    const disableStyles = clientInitialState.getIn(['rendering', 'disableStyles']);
    const renderPartialOnly = clientInitialState.getIn(['rendering', 'renderPartialOnly']);

    if (renderPartialOnly) {
      return safeSend(res, renderPartial({ html: req.appHtml, store }));
    }

    const chunkAssets = isLegacy ? legacyBrowserChunkAssets : modernBrowserChunkAssets;

    const assets = chunkAssets
      .map((chunkAsset) => `<script src="${appBundlesURLPrefix}/${chunkAsset}" integrity="${integrityManifest[chunkAsset]}" crossorigin="anonymous"></script>`)
      .join('\n          ');

    const headSectionArgs = {
      helmetInfo,
      store,
      disableScripts,
      disableStyles,
      scriptNonce,
    };

    const bodySectionArgs = {
      helmetInfo,
      isLegacy,
      assets,
      appHtml,
      appBundlesURLPrefix,
      clientInitialState,
      disableScripts,
      clientModuleMapCache,
      scriptNonce,
      pwaMetadata,
    };

    body = `
      <!DOCTYPE html>
      <html${getHtmlAttributesString(helmetInfo)}>
        ${getHead(headSectionArgs)}
        ${getBody(bodySectionArgs)}
      </html>
    `;
  } catch (err) {
    console.error('sendHtml had an error, sending static error page', err);
    return renderStaticErrorPage(res);
  }

  return safeSend(res, body);
}
