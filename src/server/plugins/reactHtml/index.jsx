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

import fp from 'fastify-plugin';
import React from 'react';
import striptags from 'striptags';
import { Set as iSet, Map as iMap } from 'immutable';
import {
  composeModules, RenderModule, getRequiredExternals, getRequiredExternalsRegistry,
} from 'holocron';
import { Provider } from 'react-redux';

import createRequestStoreHook from './createRequestStore';
import createRequestHtmlFragmentHook from './createRequestHtmlFragment';
import conditionallyAllowCors from '../conditionallyAllowCors';
import oneApp from '../../../universal';
import transit from '../../../universal/utils/transit';
import { setConfig } from '../../../universal/ducks/config';
import jsonStringifyForScript from '../../utils/jsonStringifyForScript';
import { getClientStateConfig } from '../../utils/stateConfig';
import getI18nFileFromState from '../../utils/getI18nFileFromState';
import renderModuleStyles from '../../utils/renderModuleStyles';
import readJsonFile from '../../utils/readJsonFile';
import { getClientPWAConfig, getServerPWAConfig } from '../../pwa';
import { renderForStaticMarkup } from '../../utils/reactRendering';
import renderStaticErrorPage from './staticErrorPage';
import { isRedirectUrlAllowed } from '../../utils/redirectAllowList';

const { buildVersion } = readJsonFile('../../../.build-meta.json');
const integrityManifest = readJsonFile('../../../bundle.integrity.manifest.json');
const nodeEnvIsDevelopment = process.env.NODE_ENV === 'development';

// http://www.useragentstring.com/pages/useragentstring.php?name=Internet+Explorer
const legacyIndicators = [
  'rv:11', // IE 11 on mobile
  'MSIE', // IE
];

const legacyUserAgent = (userAgent) => userAgent && legacyIndicators
  .some((legacyIndicator) => userAgent.includes(legacyIndicator));

function getChunkAssets(assetsByChunkName) {
  return Object
    .entries(assetsByChunkName)
    // i18n is different per request, app needs to be the last chunk loaded
    .filter(([chunkName]) => !chunkName.startsWith('i18n/') && !['app', 'service-worker-client'].includes(chunkName))
    .map(([, assets]) => (typeof assets === 'string' ? assets : assets[0]));
}

const modernBrowserChunkAssets = getChunkAssets(readJsonFile('../../../.build-meta.json').modernBrowserChunkAssets);
const legacyBrowserChunkAssets = getChunkAssets(readJsonFile('../../../.build-meta.json').legacyBrowserChunkAssets)
  .map((chunkAsset) => `legacy/${chunkAsset}`);

function renderI18nScript(clientInitialState, appBundlesURLPrefix) {
  const i18nFile = getI18nFileFromState(clientInitialState);
  if (!i18nFile) {
    return '';
  }

  return `<script src="${appBundlesURLPrefix}/${i18nFile}" crossorigin="anonymous"></script>`;
}

function renderScript({
  src, integrity, isDevelopmentEnv, clientCacheRevision,
}) {
  if (!integrity && !isDevelopmentEnv) console.warn(`No SRI integrity hash found for script ${src}. This is a security risk.`);
  // TODO: consider throwing an error in next major version. This is a breaking change.
  // currently we rely on "undefined" to throw integrity error in the browser, this is
  // results in poor DX, hard to find bugs.
  const additionalAttributes = isDevelopmentEnv ? '' : `integrity="${integrity}"`;
  const scriptSource = isDevelopmentEnv || !clientCacheRevision
    ? src
    : `${src}?clientCacheRevision=${clientCacheRevision}`;
  return `<script src="${scriptSource}" crossorigin="anonymous" ${additionalAttributes}></script>`;
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
    return renderScript({
      src, integrity, isDevelopmentEnv, clientCacheRevision,
    });
  }).join(isDevelopmentEnv ? '\n          ' : '');
}

export function renderExternalFallbacks({
  clientInitialState,
  moduleMap,
  isDevelopmentEnv,
}) {
  const loadedModules = clientInitialState.getIn(['holocron', 'loaded'], iSet()).toArray();
  const requiredFallbacks = loadedModules
    .reduce((externals, moduleName) => {
      const externalsMap = externals.reduce((obj, { name, version }) => ({
        ...obj,
        [name]: version,
      }), {});
      const requiredExternals = getRequiredExternals(moduleName)
        .filter(
          ({ name, version }) => !externalsMap[name] || externalsMap[name].version !== version
        );

      return [
        ...externals,
        ...requiredExternals,
      ];
    }, []);
  const { clientCacheRevision, modules } = moduleMap;

  return requiredFallbacks
    .map(({ name, browserIntegrity, moduleName }) => {
      const { baseUrl } = modules[moduleName];
      const endsWithSlash = baseUrl.endsWith('/');
      const src = [
        baseUrl,
        [
          name,
          'browser',
          'js',
        ].filter(Boolean).join('.'),
      ].join(endsWithSlash ? '' : '/');

      return renderScript({
        src,
        integrity: browserIntegrity,
        isDevelopmentEnv,
        clientCacheRevision,
      });
    }).join(isDevelopmentEnv ? '\n          ' : '');
}

function serializeClientInitialState(clientInitialState, request) {
  // try to build the full state, this _might_ fail (ex: 'Error serializing unrecognized object')
  try {
    return transit.toJSON(clientInitialState);
  } catch (err) {
    request.log.error('encountered an error serializing full client initial state', err);

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
    request.log.error('unable to build the most basic initial state for a client to startup', err);
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
  pwaMetadata,
}) {
  return `
    <head>
      ${getHelmetString(helmetInfo, disableStyles)}
      ${disableStyles ? '' : `
      ${renderModuleStyles(store)}
      `}
      ${pwaMetadata.webManifestUrl ? `<link rel="manifest" href="${pwaMetadata.webManifestUrl}">` : ''}
    </head>
  `;
}

export function getBody({
  isLegacy,
  helmetInfo,
  renderMode,
  assets,
  appHtml,
  appBundlesURLPrefix,
  clientInitialState,
  disableScripts,
  clientModuleMapCache,
  scriptNonce,
  pwaMetadata,
  request,
}) {
  const bundle = isLegacy ? 'legacyBrowser' : 'browser';
  const { bodyAttributes, script } = helmetInfo;
  const bundlePrefixForBrowser = isLegacy ? `${appBundlesURLPrefix}/legacy` : appBundlesURLPrefix;
  return `
    <body${(bodyAttributes && ` ${bodyAttributes.toString()}`) || ''}>
      <div id="root">${appHtml || ''}</div>
      ${disableScripts
    ? ''
    : `
      <script id="initial-state" ${scriptNonce ? `nonce="${scriptNonce}"` : ''}>
        window.__webpack_public_path__ = ${jsonStringifyForScript(`${appBundlesURLPrefix}/`)};
        window.__CLIENT_HOLOCRON_MODULE_MAP__ = ${jsonStringifyForScript(clientModuleMapCache[bundle])};
        window.__INITIAL_STATE__ = ${jsonStringifyForScript(serializeClientInitialState(clientInitialState, request))};
        window.__holocron_module_bundle_type__ = '${bundle}';
        window.__pwa_metadata__ = ${jsonStringifyForScript(pwaMetadata)};
        window.__render_mode__ = '${renderMode}';
        window.__HOLOCRON_EXTERNALS__ = ${jsonStringifyForScript(getRequiredExternalsRegistry())};
      </script>
      ${assets}
      ${renderI18nScript(clientInitialState, bundlePrefixForBrowser)}
      ${renderExternalFallbacks({
    clientInitialState,
    moduleMap: clientModuleMapCache[bundle],
    isDevelopmentEnv: nodeEnvIsDevelopment,
    isLegacy,
  })}
      ${renderModuleScripts({
    clientInitialState,
    moduleMap: clientModuleMapCache[bundle],
    isDevelopmentEnv: nodeEnvIsDevelopment,
    bundle,
  })}
      <script src="${bundlePrefixForBrowser}/app.js" integrity="${integrityManifest[isLegacy ? 'legacy/app.js' : 'app.js']
}" crossorigin="anonymous"></script>
      ${(script && script.toString()) || ''}
      `
}
    </body>
  `;
}

export function renderPartial({
  html: initialHtml,
  store,
  disableStyles,
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
  if (!disableStyles) {
    const styles = renderModuleStyles(store);

    if (html.startsWith('<!doctype html>')) {
      html = html.replace('</head>', `${styles}</head>`);
    } else {
      html = styles + html;
    }
  }
  return html;
}

export const checkStateForRedirectAndStatusCode = (request, reply) => {
  const { tracer } = request.openTelemetry();
  const checkStateForRedirectSpan = tracer.startSpan('checkStateForRedirect');
  const destination = request.store.getState().getIn(['redirection', 'destination']);

  if (destination) {
    if (!isRedirectUrlAllowed(destination)) {
      renderStaticErrorPage(request, reply);
      console.error('\'%s\' is not an allowed redirect URL', destination);
      checkStateForRedirectSpan.end();
      return;
    }
    reply.redirect(302, destination);
  } else {
    const checkStateForStatusCodeSpan = tracer.startSpan('checkStateForStatusCode');
    const error = request.store.getState().get('error');

    if (error) {
      const code = error.get('code');

      if (code) {
        reply.code(code);
      }
    }
    checkStateForStatusCodeSpan.end();
  }

  checkStateForRedirectSpan.end();
};

/**
 * Sends/Responds with HTML
 * @param {import('fastify').FastifyRequest} request fastify request object
 * @param {import('fastify').FastifyReply} reply fastify reply object
 */
export const sendHtml = (request, reply) => {
  const { tracer } = request.openTelemetry();
  const span = tracer.startSpan('sendHtml');

  try {
    const {
      appHtml,
      clientModuleMapCache,
      store,
      headers,
      helmetInfo = {},
      renderMode = 'hydrate',
      scriptNonce,
    } = request;
    const userAgent = headers['user-agent'];
    const isLegacy = legacyUserAgent(userAgent);

    request.log.info('sendHtml, have store? %s, have appHtml? %s', !!store, !!appHtml);

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
    const renderTextOnly = clientInitialState.getIn(['rendering', 'renderTextOnly']);
    const htmlTagReplacement = clientInitialState.getIn(['rendering', 'renderTextOnlyOptions', 'htmlTagReplacement']);
    const allowedHtmlTags = clientInitialState.getIn(['rendering', 'renderTextOnlyOptions', 'allowedHtmlTags']);

    if (renderPartialOnly) {
      return reply.header('content-type', 'text/html; charset=utf-8').send(renderPartial({ html: appHtml, store, disableStyles }));
    }

    if (renderTextOnly) {
      reply.header('content-type', 'text/plain; charset=utf-8');
      return reply.send(striptags(appHtml, allowedHtmlTags, htmlTagReplacement));
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
      pwaMetadata,
    };

    const bodySectionArgs = {
      helmetInfo,
      renderMode,
      isLegacy,
      assets,
      appHtml,
      appBundlesURLPrefix,
      clientInitialState,
      disableScripts,
      clientModuleMapCache,
      scriptNonce,
      pwaMetadata,
      request,
    };

    const html = `
      <!DOCTYPE html>
      <html${getHtmlAttributesString(helmetInfo)}>
        ${getHead(headSectionArgs)}
        ${getBody(bodySectionArgs)}
      </html>
    `;

    return reply.header('content-type', 'text/html; charset=utf-8').send(html);
  } catch (err) {
    request.log.error('sendHtml had an error, sending static error page', err);
    return renderStaticErrorPage(request, reply);
  } finally {
    span.end();
  }
};

/**
 * Creates an app shell and stores it into the request object
 * @param {import('fastify').FastifyRequest} request fastify request object
 */
const appShell = async (request) => {
  const { store: { getState, dispatch } } = request;
  const initialState = getState();
  const rootModuleName = initialState.getIn(['config', 'rootModuleName']);

  await dispatch(composeModules([{ name: rootModuleName }]));

  const { renderedString, helmetInfo } = renderForStaticMarkup(
    <Provider store={request.store}>
      <RenderModule moduleName={rootModuleName} />
    </Provider>
  );

  request.appHtml = renderedString;
  request.helmetInfo = helmetInfo;
  request.renderMode = 'render';
};

/**
 * Fastify Plugin to render HTML
 * @param {import('fastify').FastifyInstance} fastify Fastify instance
 * @param {import('fastify').FastifyPluginOptions} _opts plugin options
 * @param {import('fastify').FastifyPluginCallback} done plugin callback
 */
const reactHtml = (fastify, _opts, done) => {
  fastify.decorateRequest('store', null);
  fastify.decorateRequest('clientModuleMapCache', null);

  fastify.addHook('preHandler', async (request, reply) => {
    if (['json', 'js', 'css', 'map'].some((ext) => request.url.endsWith(ext))) {
      reply.code(404).type('text/plain; charset=utf-8').send('Not found');
    } else {
      createRequestStoreHook(request, reply, oneApp);

      if (getServerPWAConfig().serviceWorker && request.url === '/_/pwa/shell') {
        await appShell(request);
      } else {
        await createRequestHtmlFragmentHook(request, reply, oneApp);
        checkStateForRedirectAndStatusCode(request, reply);
      }
    }
  });

  conditionallyAllowCors(fastify);

  fastify.decorateReply('sendHtml', function sendHtmlDecorator() {
    const reply = this;
    const { request } = reply;

    sendHtml(request, reply);
  });

  done();
};

export default fp(reactHtml, {
  fastify: '4.x',
  name: 'reactHtml',
});
