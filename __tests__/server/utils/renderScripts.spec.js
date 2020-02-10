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

import { fromJS, Set as iSet } from 'immutable';
import uuid from 'uuid/v4';

import {
  getModules,
  renderScripts,
  renderScriptTag,
  renderI18nScript,
  renderChunkAssetScripts,
  renderModuleScripts,
  renderInitialStateScriptTag,
} from '../../../src/server/utils/renderScripts';
import { serializeClientInitialState } from '../../../src/server/utils/serializers';
import { getClientModuleMapCache } from '../../../src/server/utils/clientModuleMapCache';

jest.mock('uuid/v4');
jest.mock('../../../src/server/utils/readJsonFile');
jest.mock('../../../src/server/utils/clientModuleMapCache');

jest.spyOn(console, 'error').mockImplementation(() => null);

const rootModuleName = 'test-root';
const activeLocale = 'en-US';
const publicPath = '/_/static';

describe('renderScripts', () => {
  const clientInitialState = fromJS({
    intl: { activeLocale },
    config: { rootModuleName },
    holocron: { loaded: iSet([rootModuleName]) },
  });

  const loadedState = fromJS({
    intl: { activeLocale },
    config: { rootModuleName },
    holocron: { loaded: iSet([]) },
  });

  it('should fail without initial state', () => {
    expect.assertions(1);
    expect(() => renderScripts()).toThrow();
  });

  it('should render all app scripts with bare state as default', () => {
    expect.assertions(14);

    const scripts = renderScripts({ clientInitialState });

    const split = scripts.split('\n');
    const endsWithAppJs = split[split.length - 1].startsWith('<script src="/_/static/app.js"');
    const startsWithInitialState = scripts.startsWith(
      '<script id="initial-state" nonce="'
    );

    expect(startsWithInitialState).toBe(true);
    expect(endsWithAppJs).toBe(true);
    // check for default initial state keys
    expect(scripts).toContain("window.__render_mode__ = 'hydrate';");
    expect(scripts).toContain('window.__webpack_public_path__ = "/_/static/";');
    expect(scripts).toContain("window.__holocron_module_bundle_type__ = 'browser';");
    expect(scripts).toContain('window.__CLIENT_HOLOCRON_MODULE_MAP__ = {"key":"123",');
    expect(scripts).toContain('window.__INITIAL_STATE__ = "');
    // ensure expected script tags
    expect(scripts).toContain('<script src="/_/static/i18n/en-US.js"');
    expect(scripts).toContain('<script src="/_/static/app~vendors.js"');
    expect(scripts).toContain('<script src="/_/static/vendors.js"');
    expect(scripts).toContain('<script src="/_/static/runtime.js"');
    expect(scripts).toContain(
      '<script src="https://example.com/cdn/test-root/2.2.2/test-root.browser.js?key=123" crossorigin="anonymous" integrity="dhhfsdfwer"></script>'
    );
    // defaults are called
    expect(uuid).toHaveBeenCalled();
    expect(getClientModuleMapCache).toHaveBeenCalled();
  });

  it('should render scripts in devMode', () => {
    expect.assertions(3);

    const scripts = renderScripts({
      clientInitialState,
      devMode: true,
    });

    expect(scripts).not.toContain('integrity="');
    expect(scripts).toContain("window.__render_mode__ = 'hydrate';");
    expect(scripts).toContain('window.__webpack_public_path__ = "/_/static/";');
  });

  it('should render scripts in static mode', () => {
    expect.assertions(3);

    const scripts = renderScripts({
      clientInitialState,
      devMode: true,
      isStatic: true,
    });

    expect(scripts).not.toContain('integrity="');
    expect(scripts).toContain("window.__render_mode__ = 'render';");
    expect(scripts).toContain('window.__webpack_public_path__ = "/_/static/";');
  });

  it('should render scripts in legacy mode', () => {
    expect.assertions(3);

    const scripts = renderScripts({
      clientInitialState,
      legacy: true,
      crossOrigin: null,
      scriptNonce: null,
    });

    expect(scripts).toContain('integrity="');
    expect(scripts).toContain("window.__render_mode__ = 'hydrate';");
    expect(scripts).toContain('window.__webpack_public_path__ = "/_/static/";');
  });

  it('should render scripts in legacy and dev mode, with custom publicPath', () => {
    expect.assertions(3);

    const scripts = renderScripts({
      clientInitialState,
      devMode: true,
      legacy: true,
      crossOrigin: null,
      scriptNonce: null,
      publicPath: '/static/',
    });

    expect(scripts).not.toContain('integrity="');
    expect(scripts).toContain("window.__render_mode__ = 'hydrate';");
    expect(scripts).toContain('window.__webpack_public_path__ = "/static/";');
  });

  it('should render scripts without loaded modules', () => {
    expect.assertions(2);

    const scripts = renderScripts({
      clientInitialState: loadedState,
      devMode: true,
      crossOrigin: null,
      scriptNonce: null,
    });

    expect(scripts).toContain("window.__render_mode__ = 'hydrate';");
    expect(scripts).not.toContain(
      '<script src="https://example.com/cdn/test-root/2.2.2/test-root.browser.js?key=123" crossorigin="anonymous" integrity="dhhfsdfwer"></script>'
    );
  });

  it('should render scripts without defaults', () => {
    expect.assertions(3);

    const scripts = renderScripts({
      clientInitialState: loadedState,
      devMode: true,
      crossOrigin: null,
      scriptNonce: null,
      publicPath: null,
      clientModuleMapCache: null,
    });

    expect(scripts).toMatchSnapshot();
    expect(scripts).toContain("window.__render_mode__ = 'hydrate';");
    expect(scripts).not.toContain(
      '<script src="https://example.com/cdn/test-root/2.2.2/test-root.browser.js?key=123" crossorigin="anonymous" integrity="dhhfsdfwer"></script>'
    );
  });
});

describe('getModules', () => {
  it('should prep modules for consumption', () => {
    const bundle = 'browser';
    const modules = iSet(['a', 'b', 'test-root']);
    const moduleMap = getClientModuleMapCache();
    const set = getModules(
      modules,
      moduleMap[bundle],
      rootModuleName
    );
    const [{ [bundle]: { url } }] = set[0];

    expect(set).toMatchSnapshot();
    expect(url).toContain(rootModuleName);
    expect(url).toContain(bundle);
  });

  it('should load legacy modules', () => {
    const bundle = 'legacyBrowser';
    const modules = iSet(['a', 'b', 'test-root']);
    const moduleMap = getClientModuleMapCache();
    const set = getModules(
      modules,
      moduleMap[bundle],
      rootModuleName
    );
    const [{ [bundle]: { url } }] = set[0];

    expect(set).toMatchSnapshot();
    expect(url).toContain(rootModuleName);
    expect(url).toContain('legacy');
  });
});

describe('renderModuleScripts', () => {
  const bundle = 'browser';
  const crossOrigin = 'anonymous';
  const moduleMap = getClientModuleMapCache();
  const clientInitialState = fromJS({
    intl: { activeLocale },
    config: { rootModuleName },
    holocron: { loaded: iSet([rootModuleName]) },
  });

  it('adds cache busting key from module map to each module script src if NODE_ENV is production', () => {
    expect.assertions(3);

    const moduleScripts = renderModuleScripts({
      clientInitialState,
      moduleMap,
      bundle,
      crossOrigin,
      devMode: false,
    });
    const expected = '<script src="https://example.com/cdn/test-root/2.2.2/test-root.browser.js?key=123" crossorigin="anonymous" integrity="dhhfsdfwer"></script>';

    expect(moduleScripts).toContain(expected);
    expect(moduleScripts.startsWith(expected)).toBe(true);
    expect(moduleScripts.endsWith(expected)).toBe(true);
  });

  it('does not add cache busting key from module map to each module script src if NODE_ENV is development', () => {
    expect.assertions(3);

    const moduleScripts = renderModuleScripts({
      clientInitialState,
      moduleMap,
      bundle,
      crossOrigin,
      devMode: true,
    });
    const expected = '<script src="https://example.com/cdn/test-root/2.2.2/test-root.browser.js" crossorigin="anonymous"></script>';

    expect(moduleScripts).toContain(expected);
    expect(moduleScripts.startsWith(expected)).toBe(true);
    expect(moduleScripts.endsWith(expected)).toBe(true);
  });

  it('sends a rendered page with cross origin scripts', () => {
    expect.assertions(3);

    const moduleScripts = renderModuleScripts({
      clientInitialState,
      moduleMap,
      bundle,
      devMode: false,
      crossOrigin,
    });
    const expected = '<script src="https://example.com/cdn/test-root/2.2.2/test-root.browser.js?key=123" crossorigin="anonymous" integrity="dhhfsdfwer"></script>';

    expect(moduleScripts).toContain(expected);
    expect(moduleScripts.startsWith(expected)).toBe(true);
    expect(moduleScripts.endsWith(expected)).toBe(true);
  });

  it('send a rendered page with correctly ordered modules', () => {
    expect.assertions(1);

    const moduleScripts = renderModuleScripts({
      clientInitialState: clientInitialState.mergeDeep({
        holocron: fromJS({
          loaded: iSet(['a', 'b', 'test-root', 'c']),
        }),
      }),
      moduleMap,
      bundle,
      devMode: true,
    });
    const expected = [
      '<script src="https://example.com/cdn/test-root/2.2.2/test-root.browser.js">',
      '<script src="https://example.com/cdn/a/2.2.2/a.browser.js">',
      '<script src="https://example.com/cdn/b/2.2.2/b.browser.js">',
      '<script src="https://example.com/cdn/c/2.2.2/c.browser.js">',
    ];

    expect(
      moduleScripts
        .split('\n')
        .map((str) => str.replace('</script>', ''))
    ).toEqual(expected);
  });

  it('send a rendered page keeping correctly ordered modules if NODE_ENV is production', () => {
    expect.assertions(1);

    const moduleScripts = renderModuleScripts({
      clientInitialState: clientInitialState.mergeDeep({
        holocron: fromJS({
          loaded: iSet(['test-root', 'a', 'b', 'c']),
        }),
      }),
      moduleMap,
      bundle,
      devMode: false,
    });
    const expected = [
      '<script src="https://example.com/cdn/test-root/2.2.2/test-root.browser.js?key=123"  integrity="dhhfsdfwer">',
      '<script src="https://example.com/cdn/a/2.2.2/a.browser.js?key=123"  integrity="fhgnt543">',
      '<script src="https://example.com/cdn/b/2.2.2/b.browser.js?key=123"  integrity="yhrtrhw3">',
      '<script src="https://example.com/cdn/c/2.2.2/c.browser.js?key=123"  integrity="323egdsbf">',
    ];

    expect(moduleScripts.split('\n').map((str) => str.replace('</script>', ''))).toEqual(expected);
  });

  it('send a rendered page with module script tags with integrity attribute if NODE_ENV is production', () => {
    expect.assertions(1);

    const moduleScripts = renderModuleScripts({
      clientInitialState: clientInitialState.mergeDeep({
        holocron: fromJS({
          loaded: iSet([rootModuleName]),
        }),
      }),
      moduleMap,
      bundle,
      devMode: false,
      crossOrigin,
    });
    const expected = '<script src="https://example.com/cdn/test-root/2.2.2/test-root.browser.js?key=123" crossorigin="anonymous" integrity="dhhfsdfwer"></script>';

    expect(moduleScripts).toContain(
      expected
    );
  });
});

describe('renderI18nScript', () => {
  const crossOrigin = 'anonymous';

  it('should render activeLocale', () => {
    const clientInitialState = fromJS({
      intl: { activeLocale },
    });
    const i18nScript = renderI18nScript({
      clientInitialState,
      crossOrigin,
      publicPath,
    });

    expect(i18nScript).toContain(
      `<script src="/_/static/i18n/en-US.js" crossorigin="${crossOrigin}"></script>`
    );
  });

  it('should render activeLocale without crossorigin', () => {
    const clientInitialState = fromJS({
      intl: { activeLocale: 'es-ES' },
    });

    const i18nScript = renderI18nScript({
      clientInitialState,
      publicPath,
    });

    expect(i18nScript).toContain(
      '<script src="/_/static/i18n/es-ES.js"></script>'
    );
  });

  it('should return empty string if i18n file not found', () => {
    const clientInitialState = fromJS({
      intl: { activeLocale: '1zx' },
    });

    const i18nScript = renderI18nScript({
      clientInitialState,
      publicPath,
    });

    expect(i18nScript).toEqual('');
  });
});

describe('renderChunkAssetScripts', () => {
  const legacy = false;

  it('send a rendered page with correctly ordered modules', () => {
    expect.assertions(1);

    const chunkAssets = renderChunkAssetScripts({
      legacy,
      publicPath,
      integrity: false,
    });
    const expected = [
      `<script src="${publicPath}/app~vendors.js">`,
      `<script src="${publicPath}/runtime.js">`,
      `<script src="${publicPath}/vendors.js">`,
    ];

    expect(chunkAssets.split('\n').map((str) => str.replace('</script>', ''))).toEqual(expected);
  });

  it('send a rendered page keeping correctly ordered modules if NODE_ENV is production', () => {
    expect.assertions(3);

    const currentPath = `${publicPath}/legacy`;
    const chunkAssets = renderChunkAssetScripts({
      legacy,
      publicPath: currentPath,
      integrity: true,
    });

    expect(chunkAssets).toContain(`<script src="${currentPath}/app~vendors.js" integrity="`);
    expect(chunkAssets).toContain(`<script src="${currentPath}/runtime.js" integrity="`);
    expect(chunkAssets).toContain(`<script src="${currentPath}/vendors.js" integrity="`);
  });
});

describe('renderInitialStateScriptTag', () => {
  const bundle = 'browser';
  const webpackPath = JSON.stringify('/');
  const moduleMap = JSON.stringify(getClientModuleMapCache());
  const initialState = serializeClientInitialState(fromJS({
    intl: { activeLocale },
    config: { rootModuleName },
    holocron: { loaded: iSet([rootModuleName]) },
  }));

  it('should render initial state inside a script tag body', () => {
    expect.assertions(8);
    const id = 'initial-state';
    const scriptNonce = uuid();
    const renderedState = renderInitialStateScriptTag({
      id,
      publicPath: webpackPath,
      bundle,
      moduleMap,
      initialState,
      scriptNonce,
    });
    expect(renderedState).toMatchSnapshot();
    expect(renderedState).toContain(`<script id="${id}" nonce="${scriptNonce}">`);
    expect(renderedState).toContain("window.__render_mode__ = 'hydrate';");
    expect(renderedState).toContain(`window.__webpack_public_path__ = ${webpackPath};`);
    expect(renderedState).toContain(`window.__holocron_module_bundle_type__ = '${bundle}';`);
    expect(renderedState).toContain(`window.__CLIENT_HOLOCRON_MODULE_MAP__ = ${moduleMap}`);
    expect(renderedState).toContain(`window.__INITIAL_STATE__ = ${initialState};`);
    expect(renderedState).toContain('</script>');
  });
});

describe('renderScriptTag', () => {
  const src = '/app.js';
  const attrs = ['crossorigin="anonymous"'];
  const body = 'console.log(this);';

  it('should render bare bones script tag', () => {
    expect.assertions(2);
    expect(renderScriptTag()).toEqual('<script></script>');
    expect(renderScriptTag()).toMatchSnapshot();
  });

  it('should render script tag with src', () => {
    expect.assertions(2);
    expect(renderScriptTag(src)).toEqual(`<script src="${src}"></script>`);
    expect(renderScriptTag(src)).toMatchSnapshot();
  });

  it('should render script tag with src and attrs', () => {
    expect.assertions(2);
    expect(renderScriptTag(src, [...attrs])).toEqual(
      `<script src="${src}" crossorigin="anonymous"></script>`
    );
    expect(renderScriptTag(src, [...attrs])).toMatchSnapshot();
  });

  it('should render script tag with src, attrs and body', () => {
    expect.assertions(2);
    expect(renderScriptTag(src, [...attrs], body)).toEqual(
      `<script src="${src}" crossorigin="anonymous">\n${body}\n</script>`
    );
    expect(renderScriptTag(src, [...attrs], body)).toMatchSnapshot();
  });
});
