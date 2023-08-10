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

import Fastify from 'fastify';
import { fromJS } from 'immutable';
import reactHtml, {
  sendHtml,
  renderModuleScripts,
  checkStateForRedirectAndStatusCode,
} from '../../../../src/server/plugins/reactHtml';
// _client is a method to control the mock
// eslint-disable-next-line import/named
import { getClientStateConfig } from '../../../../src/server/utils/stateConfig';
// _setVars is a method to control the mock
// eslint-disable-next-line import/named
import transit from '../../../../src/universal/utils/transit';
import { setClientModuleMapCache, getClientModuleMapCache } from '../../../../src/server/utils/clientModuleMapCache';
import { getClientPWAConfig, getServerPWAConfig } from '../../../../src/server/pwa/config';
import createRequestStoreHook from '../../../../src/server/plugins/reactHtml/createRequestStore';
import createRequestHtmlFragmentHook from '../../../../src/server/plugins/reactHtml/createRequestHtmlFragment';
import conditionallyAllowCors from '../../../../src/server/plugins/conditionallyAllowCors';
import { isRedirectUrlAllowed } from '../../../../src/server/utils/redirectAllowList';

jest.spyOn(console, 'error').mockImplementation(() => 0);

jest.mock('react-helmet');

jest.mock('../../../../src/server/utils/redirectAllowList', () => ({
  isRedirectUrlAllowed: jest.fn(() => true),
}));

jest.mock('holocron', () => {
  const actualHolocron = jest.requireActual('holocron');

  return {
    ...actualHolocron,
    getModule: () => {
      const module = () => 0;
      module.ssrStyles = {};
      module.ssrStyles.getFullSheet = () => '.class { background: red; }';
      return module;
    },
  };
});

jest.mock('@americanexpress/fetch-enhancers', () => ({
  createTimeoutFetch: jest.fn(
    (timeout) => (next) => (url) => next(url)
      .then((reply) => {
        // eslint-disable-next-line no-param-reassign
        reply.timeout = timeout;
        return reply;
      })
  ),
}));
jest.mock('../../../../src/server/utils/stateConfig');
jest.mock('../../../../src/server/utils/readJsonFile', () => (filePath) => {
  switch (filePath) {
    case '../../../.build-meta.json':
      return {
        buildVersion: '1.2.3-rc.4-abc123',
        modernBrowserChunkAssets: {
          'i18n/en': 'i18n/en.js',
          'bundle~common': 'bundle~common.js',
          vendors: ['vendors.js', 'vendors.js.map'],
          'i18n/en-US': 'i18n/en-US.js',
          'i18n/tk-TM': 'i18n/tk-TM.js',
          'i18n/am': ['i18n/am.js', 'i18n/am.js.map'],
          'i18n/bs~i18n/bs-Cyrl~i18n/bs-Cyrl-BA~i18n/bs-Latn~i18n/bs-Latn-BA': [
            'i18n/bs~i18n/bs-Cyrl~i18n/bs-Cyrl-BA~i18n/bs-Latn~i18n/bs-Latn-BA.js',
            'i18n/bs~i18n/bs-Cyrl~i18n/bs-Cyrl-BA~i18n/bs-Latn~i18n/bs-Latn-BA.js.map',
          ],
        },
        legacyBrowserChunkAssets: {
          'i18n/en': 'i18n/en.js',
          'bundle~common': 'bundle~common.js',
          vendors: ['vendors.js', 'vendors.js.map'],
          'i18n/en-US': 'i18n/en-US.js',
          'i18n/tk-TM': 'i18n/tk-TM.js',
          'i18n/am': ['i18n/am.js', 'i18n/am.js.map'],
          'i18n/bs~i18n/bs-Cyrl~i18n/bs-Cyrl-BA~i18n/bs-Latn~i18n/bs-Latn-BA': [
            'i18n/bs~i18n/bs-Cyrl~i18n/bs-Cyrl-BA~i18n/bs-Latn~i18n/bs-Latn-BA.js',
            'i18n/bs~i18n/bs-Cyrl~i18n/bs-Cyrl-BA~i18n/bs-Latn~i18n/bs-Latn-BA.js.map',
          ],
        },
      };
    case '../../../bundle.integrity.manifest.json':
      return {
        'app.js': '098',
        'bundle~common.js': '1234',
        'vendors.js': '5678',
        'legacy/app.js': 'zyx',
        'legacy/bundle~common.js': 'abc',
        'legacy/vendors.js': 'def',
      };
    default:
      throw new Error('Couldn\'t find JSON file to read');
  }
});
jest.mock('../../../../src/server/pwa/config', () => ({
  getClientPWAConfig: jest.fn(() => ({
    serviceWorker: false,
    serviceWorkerScope: null,
    serviceWorkerScriptUrl: false,
    webManifestUrl: false,
    offlineUrl: false,
  })),
  getServerPWAConfig: jest.fn(() => ({
    serviceWorker: false,
  })),
}));
jest.mock('../../../../src/universal/ducks/config');
jest.mock('../../../../src/universal/utils/transit', () => ({
  toJSON: jest.fn(() => 'serialized in a string'),
}));
jest.mock('../../../../src/server/utils/createCircuitBreaker', () => {
  const breaker = jest.fn();
  const mockCreateCircuitBreaker = (asyncFunctionThatMightFail) => {
    breaker.fire = jest.fn((...args) => {
      asyncFunctionThatMightFail(...args);
      return false;
    });
    return breaker;
  };
  mockCreateCircuitBreaker.getBreaker = () => breaker;
  return mockCreateCircuitBreaker;
});

jest.mock('../../../../src/server/plugins/reactHtml/createRequestStore');
jest.mock('../../../../src/server/plugins/reactHtml/createRequestHtmlFragment');
jest.mock('../../../../src/server/plugins/conditionallyAllowCors');

global.fetch = () => Promise.resolve({ data: 'data' });

describe('reactHtml', () => {
  const appHtml = '<p>Why, hello!</p>';

  let request;
  let reply;

  const setFullMap = () => {
    setClientModuleMapCache({
      modules: {
        'test-root': {
          node: {
            url: 'https://example.com/cdn/test-root/2.2.2/test-root.node.js',
            integrity: '4y45hr',
          },
          browser: {
            url: 'https://example.com/cdn/test-root/2.2.2/test-root.browser.js',
            integrity: 'dhhfsdfwer',
          },
          legacyBrowser: {
            url: 'https://example.com/cdn/test-root/2.2.2/test-root.legacy.browser.js',
            integrity: '567ty',
          },
        },
        a: {
          node: {
            url: 'https://example.com/cdn/a/2.2.2/a.node.js',
            integrity: 'awefs',
          },
          browser: {
            url: 'https://example.com/cdn/a/2.2.2/a.browser.js',
            integrity: 'fhgnt543',
          },
          legacyBrowser: {
            url: 'https://example.com/cdn/a/2.2.2/a.legacy.browser.js',
            integrity: '7567ee',
          },
        },
        c: {
          node: {
            url: 'https://example.com/cdn/c/2.2.2/c.node.js',
            integrity: '3535eqr',
          },
          browser: {
            url: 'https://example.com/cdn/c/2.2.2/c.browser.js',
            integrity: '323egdsbf',
          },
          legacyBrowser: {
            url: 'https://example.com/cdn/c/2.2.2/c.legacy.browser.js',
            integrity: 'd8vdfdfv',
          },
        },
        b: {
          node: {
            url: 'https://example.com/cdn/b/2.2.2/b.node.js',
            integrity: '4y45hr',
          },
          browser: {
            url: 'https://example.com/cdn/b/2.2.2/b.browser.js',
            integrity: 'yhrtrhw3',
          },
          legacyBrowser: {
            url: 'https://example.com/cdn/b/2.2.2/b.legacy.browser.js',
            integrity: '7567ee',
          },
        },
      },
    });
    request.clientModuleMapCache = getClientModuleMapCache();
  };

  beforeEach(() => {
    setClientModuleMapCache({
      modules: {
        'test-root': {
          baseUrl: 'https://example.com/cdn/test-root/2.2.2/',
          node: {
            url: 'https://example.com/cdn/test-root/2.2.2/test-root.node.js',
            integrity: '4y45hr',
          },
          browser: {
            url: 'https://example.com/cdn/test-root/2.2.2/test-root.browser.js',
            integrity: 'nggdfhr34',
          },
          legacyBrowser: {
            url: 'https://example.com/cdn/test-root/2.2.2/test-root.legacy.browser.js',
            integrity: '7567ee',
          },
        },
      },
    });
    jest.resetModules();
    jest.clearAllMocks();

    request = jest.fn();
    request.headers = {
      // we need a legitimate user-agent string here to test between modern and legacy browsers
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36',
    };
    request.url = 'http://example.com/request';
    request.store = {
      dispatch: jest.fn(),
      getState: jest.fn(() => fromJS({
        holocron: fromJS({
          loaded: ['test-root'],
        }),
        intl: fromJS({ activeLocale: 'en-US' }),
        rendering: fromJS({}),
      })),
    };
    request.clientModuleMapCache = getClientModuleMapCache();
    request.appHtml = appHtml;
    request.log = {
      info: jest.fn(),
      error: jest.fn(),
    };

    reply = jest.fn();
    reply.status = jest.fn(() => reply);
    reply.code = jest.fn(() => reply);
    reply.send = jest.fn(() => reply);
    reply.redirect = jest.fn(() => reply);
    reply.type = jest.fn(() => reply);
    reply.code = jest.fn(() => reply);
    reply.header = jest.fn(() => reply);
    reply.request = request;

    getClientStateConfig.mockImplementation(() => ({
      cdnUrl: '/cdnUrl/',
      rootModuleName: 'test-root',
    }));
  });

  function removeInitialState(body) {
    if (!(body && body.replace)) {
      return body;
    }

    return body.replace(
      /window\.__INITIAL_STATE__(.+)\n/,
      '{removed_initial_state}\n'
    );
  }

  describe('sendHtml', () => {
    it('sends a rendered page', () => {
      sendHtml(request, reply);

      expect(request.log.error).not.toHaveBeenCalled();

      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(reply.send.mock.calls[0][0]).toContain('<title>One App</title>');

      expect(reply.send.mock.calls[0][0]).toContain(appHtml);
      expect(reply.send.mock.calls[0][0]).toContain(
        'window.__webpack_public_path__ = "/cdnUrl/app/1.2.3-rc.4-abc123/";'
      );
      expect(reply.send.mock.calls[0][0]).toContain(
        'window.__holocron_module_bundle_type__ = \'browser\';'
      );
      expect(reply.send.mock.calls[0][0]).toContain(
        'window.__CLIENT_HOLOCRON_MODULE_MAP__ = {"modules":{"test-root":{"baseUrl":"https://example.com/cdn/test-root/2.2.2/","browser":{"url":"https://example.com/cdn/test-root/2.2.2/test-root.browser.js","integrity":"nggdfhr34"}}}};'
      );
      expect(removeInitialState(reply.send.mock.calls[0][0])).not.toContain('undefined');
    });

    it('sends a rendered page with the __holocron_module_bundle_type__ global set according to the user agent and the client module map that only includes the relevant details', () => {
      // MSIE indicates legacy IE
      request.headers['user-agent'] = 'Browser/5.0 (compatible; MSIE 100.0; Doors TX 81.4; Layers/1.0)';

      sendHtml(request, reply);

      expect(request.log.error).not.toHaveBeenCalled();

      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(reply.send.mock.calls[0][0]).toContain('<title>One App</title>');

      expect(reply.send.mock.calls[0][0]).toContain(appHtml);
      expect(reply.send.mock.calls[0][0]).toContain(
        'window.__holocron_module_bundle_type__ = \'legacyBrowser\';'
      );
      expect(reply.send.mock.calls[0][0]).toContain(
        'window.__CLIENT_HOLOCRON_MODULE_MAP__ = {"modules":{"test-root":{"baseUrl":"https://example.com/cdn/test-root/2.2.2/","legacyBrowser":{"url":"https://example.com/cdn/test-root/2.2.2/test-root.legacy.browser.js","integrity":"7567ee"}}}};'
      );
      expect(removeInitialState(reply.send.mock.calls[0][0])).not.toContain('undefined');
    });

    it('sends a rendered page with defaults', () => {
      getClientStateConfig.mockImplementation(() => ({}));
      sendHtml(request, reply);
      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(reply.send.mock.calls[0][0]).toContain('<title>One App</title>');
      expect(reply.send.mock.calls[0][0]).toContain(appHtml);
      expect(reply.send.mock.calls[0][0]).toContain(
        'window.__webpack_public_path__ = "/_/static/app/1.2.3-rc.4-abc123/";'
      );
      expect(removeInitialState(reply.send.mock.calls[0][0])).not.toContain('undefined');
    });

    it('sends a rendered page with helmet info', () => {
      request.helmetInfo = {
        htmlAttributes: { toString: jest.fn(() => 'htmlAttributes') },
        bodyAttributes: { toString: jest.fn(() => 'bodyAttributes') },
        title: { toString: jest.fn(() => '<title>title</title>') },
        meta: { toString: jest.fn(() => '<meta>') },
        style: { toString: jest.fn(() => '<style>.style</style>') },
        script: { toString: jest.fn(() => '<script>/*script*/</script>') },
        link: { toString: jest.fn(() => '<link rel="stylesheet" />') },
        base: { toString: jest.fn(() => '<base>') },
      };
      sendHtml(request, reply);
      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(reply.send.mock.calls[0][0]).toContain('<html htmlAttributes>');

      expect(reply.send.mock.calls[0][0]).not.toContain('<title>One App</title>');
      expect(reply.send.mock.calls[0][0]).toContain('<title>title</title>');

      expect(reply.send.mock.calls[0][0]).toContain('<meta>');
      expect(reply.send.mock.calls[0][0]).toContain('<body bodyAttributes>');
      expect(reply.send.mock.calls[0][0]).toContain('<style>.style</style>');
      expect(reply.send.mock.calls[0][0]).toContain('<script>/*script*/</script>');
      expect(reply.send.mock.calls[0][0]).toContain('<link rel="stylesheet" />');
      expect(reply.send.mock.calls[0][0]).toContain('<base>');

      expect(removeInitialState(reply.send.mock.calls[0][0])).not.toContain('undefined');
    });

    it('sends a rendered page with the one-app script tags', () => {
      sendHtml(request, reply);
      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send.mock.calls[0][0]).toContain('<script src="/cdnUrl/app/1.2.3-rc.4-abc123/bundle~common.js" integrity="1234" crossorigin="anonymous"></script>');
      expect(reply.send.mock.calls[0][0]).toContain('<script src="/cdnUrl/app/1.2.3-rc.4-abc123/app.js" integrity="098" crossorigin="anonymous"></script>');
    });

    it('sends a rendered page with the legacy app bundle according to the user agent', () => {
      // rv:11 indicates IE 11  on mobile
      request.headers['user-agent'] = 'Browser/5.0 (compatible; NUEI 100.0; Doors TX 81.4; rv:11)';
      sendHtml(request, reply);
      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send.mock.calls[0][0]).toContain('<script src="/cdnUrl/app/1.2.3-rc.4-abc123/legacy/bundle~common.js" integrity="abc" crossorigin="anonymous"></script>');
      expect(reply.send.mock.calls[0][0]).toContain('<script src="/cdnUrl/app/1.2.3-rc.4-abc123/legacy/app.js" integrity="zyx" crossorigin="anonymous"></script>');
    });

    it('sends a rendered page with the locale data script tag', () => {
      sendHtml(request, reply);
      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send.mock.calls[0][0]).toContain('<script src="/cdnUrl/app/1.2.3-rc.4-abc123/i18n/en-US.js"');
    });

    it('sends a rendered page without the locale data script tag when the activeLocale is not known', () => {
      setFullMap();
      request.store = {
        dispatch: jest.fn(),
        getState: jest.fn(() => fromJS({
          holocron: fromJS({
            loaded: ['a'],
          }),
          intl: fromJS({ activeLocale: 'tlh' }),
          rendering: fromJS({}),
        })),
      };
      sendHtml(request, reply);
      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send.mock.calls[0][0]).not.toContain('src="/cdnUrl/app/1.2.3-rc.4-abc123/i18n/');
    });

    it('sends a rendered page with the module styles and scripts', () => {
      sendHtml(request, reply);
      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send.mock.calls[0][0]).toContain(
        '<style class="ssr-css">.class { background: red; }</style>'
      );
      expect(reply.send.mock.calls[0][0]).toContain(
        '<script src="/cdnUrl/app/1.2.3-rc.4-abc123/i18n/en-US.js" crossorigin="anonymous"></script>'
      );
      expect(reply.send.mock.calls[0][0]).toContain(
        '<script src="/cdnUrl/app/1.2.3-rc.4-abc123/bundle~common.js" integrity="1234" crossorigin="anonymous"></script>'
      );
      expect(reply.send.mock.calls[0][0]).toContain(
        '<script src="/cdnUrl/app/1.2.3-rc.4-abc123/app.js" integrity="098" crossorigin="anonymous"></script>'
      );
      expect(reply.send.mock.calls[0][0]).toContain(
        '<script src="https://example.com/cdn/test-root/2.2.2/test-root.browser.js'
      );
    });

    it('sends the static error page when the store malfunctions', () => {
      request.store = {
        getState: jest.fn(() => { throw new Error('cannot get state'); }),
      };
      sendHtml(request, reply);
      expect(request.log.error).toHaveBeenCalled();
      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(reply.send.mock.calls[0][0]).toContain('<meta name="application-name" content="one-app">');
      expect(removeInitialState(reply.send.mock.calls[0][0])).not.toContain('undefined');
    });

    it('sends the static error page when appHtml is not a string', () => {
      request.appHtml = [1, 2, 3];
      sendHtml(request, reply);
      expect(request.log.error).toHaveBeenCalled();
      expect(reply.code).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(removeInitialState(reply.send.mock.calls[0][0])).not.toContain('undefined');
    });

    it('sends a page with an empty div#root when appHtml is undefined', () => {
      delete request.appHtml;
      sendHtml(request, reply);
      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(reply.send.mock.calls[0][0]).not.toContain(appHtml);
      expect(reply.send.mock.calls[0][0]).toContain('<div id="root"></div>');
    });

    it('includes scriptNonce when provided', () => {
      request.scriptNonce = '54321';
      sendHtml(request, reply);
      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(/<script.*nonce="54321"/.test(reply.send.mock.calls[0][0])).toBe(true);
    });

    describe('render modes', () => {
      it('render mode is "hydrate" by default', () => {
        sendHtml(request, reply);
        expect(reply.send).toHaveBeenCalledTimes(1);
        expect(reply.send.mock.calls[0][0]).toContain("window.__render_mode__ = 'hydrate';");
      });

      it('render mode is "render" when set', () => {
        sendHtml({ ...request, renderMode: 'render' }, reply);
        expect(reply.send).toHaveBeenCalledTimes(1);
        expect(reply.send.mock.calls[0][0]).toContain("window.__render_mode__ = 'render';");
      });
    });

    describe('dynamic chunks', () => {
      it('does not add service-worker-client.js to the document script tags', () => {
        sendHtml(request, reply);
        expect(reply.send).toHaveBeenCalledTimes(1);
        expect(reply.send.mock.calls[0][0]).not.toContain('service-worker-client.js');
      });
    });

    describe('PWA config rendering', () => {
      it('includes __pwa_metadata__ with disabled values', () => {
        sendHtml(request, reply);
        expect(reply.send).toHaveBeenCalledTimes(1);
        expect(reply.send.mock.calls[0][0]).toContain('window.__pwa_metadata__ = {"serviceWorker":false');
      });

      it('includes __pwa_metadata__ with enabled values', () => {
        getClientPWAConfig.mockImplementationOnce(() => ({
          serviceWorker: true,
          serviceWorkerScope: '/',
          serviceWorkerScriptUrl: '/_/pwa/service-worker.js',
          webManifestUrl: '/_/pwa/manifest.webmanifest',
          offlineUrl: '/_/pwa/shell',
        }));
        sendHtml(request, reply);
        expect(reply.send).toHaveBeenCalledTimes(1);
        expect(reply.send.mock.calls[0][0]).toContain(
          'window.__pwa_metadata__ = {"serviceWorker":true,"serviceWorkerScope":"/","serviceWorkerScriptUrl":"/_/pwa/service-worker.js","webManifestUrl":"/_/pwa/manifest.webmanifest","offlineUrl":"/_/pwa/shell"};'
        );
        expect(/<link rel="manifest" href="\/_\/pwa\/manifest\.webmanifest">/.test(reply.send.mock.calls[0][0])).toBe(true);
      });
    });

    describe('renderPartialOnly', () => {
      beforeEach(() => {
        request.store = {
          dispatch: jest.fn(),
          getState: jest.fn(() => fromJS({
            holocron: fromJS({
              loaded: ['a'],
            }),
            intl: fromJS({ activeLocale: 'en-US' }),
            rendering: fromJS({
              renderPartialOnly: true,
            }),
          })),
        };
        setFullMap();
      });

      afterEach(() => { request.appHtml = appHtml; });

      it('sends an incomplete HTML document with styles', () => {
        sendHtml(request, reply);
        expect(reply.send).toHaveBeenCalledTimes(1);
        expect(reply.send.mock.calls[0][0]).not.toContain('<!DOCTYPE html>');
        expect(reply.send.mock.calls[0][0]).not.toContain('<title>One App</title>');

        expect(reply.send.mock.calls[0][0]).toBe(`<style class="ssr-css">.class { background: red; }</style>${appHtml}`);
        expect(removeInitialState(reply.send.mock.calls[0][0])).not.toContain('undefined');
      });

      it('sends an complete HTML document with styles in the head', () => {
        request.appHtml = `<dangerously-return-only-doctype><!doctype html><html><head><title>Some Title</title></head>${appHtml}</html></dangerously-return-only-doctype>`;
        sendHtml(request, reply);
        expect(reply.send).toHaveBeenCalledTimes(1);
        expect(reply.send.mock.calls[0][0]).not.toContain('<!DOCTYPE html>');
        expect(reply.send.mock.calls[0][0]).not.toContain('<title>One App</title>');

        expect(reply.send.mock.calls[0][0]).toBe(`<!doctype html><html><head><title>Some Title</title><style class="ssr-css">.class { background: red; }</style></head>${appHtml}</html>`);
        expect(removeInitialState(reply.send.mock.calls[0][0])).not.toContain('undefined');
      });

      it('sends an incomplete HTML document without styles', () => {
        request.appHtml = `<dangerously-return-only-doctype><!doctype html><html><head><title>Some Title</title></head>${appHtml}</html></dangerously-return-only-doctype>`;
        request.store.getState.mockImplementationOnce(() => fromJS({
          holocron: fromJS({
            loaded: ['a'],
          }),
          intl: fromJS({ activeLocale: 'en-US' }),
          rendering: fromJS({
            renderPartialOnly: true,
            disableStyles: true,
          }),
        }));
        sendHtml(request, reply);
        expect(reply.send).toHaveBeenCalledTimes(1);
        expect(reply.send.mock.calls[0][0]).toBe(`<!doctype html><html><head><title>Some Title</title></head>${appHtml}</html>`);
      });
    });

    describe('renderTextOnly', () => {
      beforeEach(() => {
        request.store = {
          dispatch: jest.fn(),
          getState: jest.fn(() => fromJS({
            holocron: fromJS({
              loaded: ['a'],
            }),
            intl: fromJS({ activeLocale: 'en-US' }),
            rendering: fromJS({
              renderTextOnly: true,
              renderTextOnlyOptions: { htmlTagReplacement: '', allowedHtmlTags: [] },
            }),
          })),
        };
        setFullMap();
      });

      afterEach(() => { request.appHtml = appHtml; });

      it('sends a text only response with no HTML present', () => {
        request.appHtml = 'text only without html';
        const fakeReply = {
          send: jest.fn(() => fakeReply),
          code: jest.fn(() => fakeReply),
          header: jest.fn(() => fakeReply),
          type: jest.fn(() => fakeReply),
        };
        sendHtml(request, fakeReply);
        expect(request.log.error).not.toHaveBeenCalled();
        expect(fakeReply.send).toHaveBeenCalledTimes(1);
        expect(fakeReply.header).toHaveBeenCalledWith('content-type', 'text/plain; charset=utf-8');
        expect(fakeReply.send.mock.calls[0][0]).not.toContain('<!DOCTYPE html>');
        expect(fakeReply.send.mock.calls[0][0]).not.toContain('<body');
        expect(fakeReply.send.mock.calls[0][0]).toBe(request.appHtml);
      });
    });

    describe('disableScripts', () => {
      beforeEach(() => {
        request.store = {
          dispatch: jest.fn(),
          getState: jest.fn(() => fromJS({
            holocron: fromJS({
              loaded: ['a'],
            }),
            intl: fromJS({ activeLocale: 'en-US' }),
            rendering: fromJS({
              disableScripts: true,
            }),
          })),
        };
        setFullMap();
      });

      it('sends a rendered page', () => {
        sendHtml(request, reply);
        expect(reply.send).toHaveBeenCalledTimes(1);
        expect(reply.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
        expect(reply.send.mock.calls[0][0]).toContain('<title>One App</title>');

        expect(reply.send.mock.calls[0][0]).toContain(appHtml);
        expect(removeInitialState(reply.send.mock.calls[0][0])).not.toContain('undefined');
      });

      it('prevents global state from being added to rendered page', () => {
        sendHtml(request, reply);
        expect(reply.send.mock.calls[0][0]).not.toContain('window.__webpack_public_path__');
        expect(reply.send.mock.calls[0][0]).not.toContain('window.__holocron_modules_path__');
        expect(reply.send.mock.calls[0][0]).not.toContain('window.__INITIAL_STATE__');
      });

      it('prevents all scripts from being added to rendered page', () => {
        request.helmetInfo = {
          htmlAttributes: { toString: jest.fn(() => 'htmlAttributes') },
          bodyAttributes: { toString: jest.fn(() => 'bodyAttributes') },
          title: { toString: jest.fn(() => '<title>title</title>') },
          meta: { toString: jest.fn(() => '<meta>') },
          style: { toString: jest.fn(() => '<style>.style</style>') },
          script: { toString: jest.fn(() => '<script>/*script*/</script>') },
          link: { toString: jest.fn(() => '<link rel="stylesheet" /><link rel="icon" href="favicon.ico" />') },
          base: { toString: jest.fn(() => '<base>') },
        };
        sendHtml(request, reply);
        expect(reply.send.mock.calls[0][0]).not.toContain('<script');
      });
    });

    describe('disableStyles', () => {
      beforeEach(() => {
        request.store = {
          dispatch: jest.fn(),
          getState: jest.fn(() => fromJS({
            holocron: fromJS({
              loaded: ['a'],
            }),
            intl: fromJS({ activeLocale: 'en-US' }),
            rendering: fromJS({
              disableStyles: true,
            }),
          })),
        };
        setFullMap();
      });

      it('prevents all stylesheets from being added to the rendered page', () => {
        request.clientModuleMapCache = getClientModuleMapCache();
        process.env.NODE_ENV = 'production';
        request.helmetInfo = {
          htmlAttributes: { toString: jest.fn(() => 'htmlAttributes') },
          bodyAttributes: { toString: jest.fn(() => 'bodyAttributes') },
          title: { toString: jest.fn(() => '<title>title</title>') },
          meta: { toString: jest.fn(() => '<meta>') },
          style: { toString: jest.fn(() => '<style>.style</style>') },
          script: { toString: jest.fn(() => '<script>/*script*/</script>') },
          link: { toString: jest.fn(() => '<link rel="stylesheet" /><link rel="icon" href="favicon.ico" />') },
          base: { toString: jest.fn(() => '<base>') },
        };
        sendHtml(request, reply);
        expect(reply.send.mock.calls[0][0]).not.toContain('<link rel="stylesheet"');
        expect(reply.send.mock.calls[0][0]).toContain('<link rel="icon" href="favicon.ico" />');
      });

      it('prevents all style tags from being added to the rendered page', () => {
        process.env.NODE_ENV = 'production';
        request.helmetInfo = {
          htmlAttributes: { toString: jest.fn(() => 'htmlAttributes') },
          bodyAttributes: { toString: jest.fn(() => 'bodyAttributes') },
          title: { toString: jest.fn(() => '<title>title</title>') },
          meta: { toString: jest.fn(() => '<meta>') },
          style: { toString: jest.fn(() => '<style>.style</style>') },
          script: { toString: jest.fn(() => '<script>/*script*/</script>') },
          link: { toString: jest.fn(() => '<link rel="stylesheet" /><link rel="icon" href="favicon.ico" />') },
          base: { toString: jest.fn(() => '<base>') },
        };
        sendHtml(request, reply);
        expect(reply.send.mock.calls[0][0]).not.toContain('<style');
      });
    });
  });

  describe('renderModuleScripts', () => {
    let clientModuleMapCache;

    beforeEach(() => {
      setClientModuleMapCache({
        clientCacheRevision: '123',
        modules: {
          'test-root': {
            node: {
              url: 'https://example.com/cdn/test-root/2.2.2/test-root.node.js',
              integrity: '4y45hr',
            },
            browser: {
              url: 'https://example.com/cdn/test-root/2.2.2/test-root.browser.js',
              integrity: 'nggdfhr34',
            },
            legacyBrowser: {
              url: 'https://example.com/cdn/test-root/2.2.2/test-root.legacy.browser.js',
              integrity: '7567ee',
            },
          },
        },
      });
      clientModuleMapCache = getClientModuleMapCache();
    });

    it('adds cache busting clientCacheRevision from module map to each module script src if NODE_ENV is production', () => {
      expect(renderModuleScripts({
        clientInitialState: request.store.getState(),
        moduleMap: clientModuleMapCache.browser,
        isDevelopmentEnv: false,
        bundle: 'browser',
      })).toMatchSnapshot();
    });

    it('does not add cache busting clientCacheRevision from module map to each module script src if NODE_ENV is development', () => {
      expect(renderModuleScripts({
        clientInitialState: request.store.getState(),
        moduleMap: clientModuleMapCache.browser,
        isDevelopmentEnv: true,
        bundle: 'browser',
      })).toMatchSnapshot();
    });

    it('does not add cache busting clientCacheRevision if not present', () => {
      const moduleMap = { ...clientModuleMapCache.browser };
      delete moduleMap.clientCacheRevision;
      expect(renderModuleScripts({
        clientInitialState: request.store.getState(),
        moduleMap,
        isDevelopmentEnv: false,
        bundle: 'browser',
      })).toMatchSnapshot();
    });

    it('sends a rendered page with cross origin scripts', () => {
      expect(renderModuleScripts({
        clientInitialState: request.store.getState(),
        moduleMap: clientModuleMapCache.browser,
        isDevelopmentEnv: true,
        bundle: 'browser',
      })).toMatchSnapshot();
    });

    it('send a rendered page with correctly ordered modules', () => {
      setFullMap();

      const holocronState = fromJS({
        holocron: {
          loaded: ['a', 'b', 'test-root', 'c'],
        },
      });
      expect(renderModuleScripts({
        clientInitialState: holocronState,
        moduleMap: getClientModuleMapCache().browser,
        isDevelopmentEnv: false,
        bundle: 'browser',
      })).toMatchSnapshot();
    });

    it('send a rendered page keeping correctly ordered modules', () => {
      setFullMap();

      const holocronState = fromJS({
        holocron: fromJS({
          loaded: ['test-root', 'a', 'b', 'c'],
        }),
      });
      expect(renderModuleScripts({
        clientInitialState: holocronState,
        moduleMap: getClientModuleMapCache().browser,
        isDevelopmentEnv: false,
        bundle: 'browser',
      })).toMatchSnapshot();
    });

    it('send a rendered page with module script tags with integrity attribute if NODE_ENV is production', () => {
      const holocronState = fromJS({
        holocron: fromJS({
          loaded: ['test-root'],
        }),
      });
      expect(renderModuleScripts({
        clientInitialState: holocronState,
        moduleMap: clientModuleMapCache.browser,
        isDevelopmentEnv: false,
        bundle: 'browser',
      })).toMatchSnapshot();
    });
  });

  describe('serializing the client initial state', () => {
    it('sends the bare state possible when there are errors serializing the entire state', () => {
      const fullStateError = new Error('Error serializing unrecognized object');
      transit.toJSON
        .mockClear()
        .mockImplementationOnce(() => { throw fullStateError; })
        .mockImplementationOnce(() => 'this is the cache clean call')
        .mockImplementationOnce(() => 'serialized bare state possible');

      sendHtml(request, reply);
      expect(request.log.error).toHaveBeenCalledTimes(1);
      expect(request.log.error).toHaveBeenCalledWith('encountered an error serializing full client initial state', fullStateError);
      expect(transit.toJSON).toHaveBeenCalledTimes(3);

      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');

      expect(reply.send.mock.calls[0][0]).toContain(appHtml);
      expect(reply.send.mock.calls[0][0]).toContain(
        'window.__webpack_public_path__ = "/cdnUrl/app/1.2.3-rc.4-abc123/";'
      );
      expect(reply.send.mock.calls[0][0]).toContain(
        'window.__INITIAL_STATE__ = "serialized bare state possible";'
      );
      expect(removeInitialState(reply.send.mock.calls[0][0])).not.toContain('undefined');
    });

    it('logs when even the base state possible cannot be serialized', () => {
      const fullStateError = new Error('Error serializing unrecognized object');
      const minimalStateError = new Error('this is really bad');
      transit.toJSON
        .mockClear()
        .mockImplementationOnce(() => { throw fullStateError; })
        .mockImplementationOnce(() => 'this is the cache clean call')
        .mockImplementationOnce(() => { throw minimalStateError; })
        .mockImplementationOnce(() => 'second cache clean call');

      sendHtml(request, reply);
      expect(request.log.error).toHaveBeenCalledTimes(3);
      expect(request.log.error).toHaveBeenCalledWith('encountered an error serializing full client initial state', fullStateError);
      expect(request.log.error).toHaveBeenCalledWith('unable to build the most basic initial state for a client to startup', minimalStateError);
      expect(transit.toJSON).toHaveBeenCalledTimes(4);

      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(reply.send.mock.calls[0][0]).toContain('<title>One App</title>');

      expect(reply.send.mock.calls[0][0]).not.toContain(appHtml);
      expect(reply.send.mock.calls[0][0]).toContain(
        'Sorry, we are unable to load this page at this time. Please try again later.'
      );
    });
  });

  describe('checkStateForRedirectAndStatusCode', () => {
    const destination = 'http://example.com/';
    let state = fromJS({ redirection: { destination: null } });
    const req = { store: { getState: () => state }, headers: {} };
    const res = { redirect: jest.fn(), code: jest.fn() };

    beforeEach(() => jest.clearAllMocks());

    it('should redirect if there is a destination', () => {
      state = fromJS({ redirection: { destination } });
      checkStateForRedirectAndStatusCode(req, res);
      expect(res.redirect).toHaveBeenCalledWith(302, destination);
    });

    it('should got to the next middleware if there is no destination', () => {
      state = fromJS({ redirection: { destination: null } });
      checkStateForRedirectAndStatusCode(req, res);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('sets the status code', () => {
      state = fromJS({ redirection: { destination: null }, error: { code: 500 } });
      checkStateForRedirectAndStatusCode(req, res);
      expect(res.redirect).not.toHaveBeenCalled();
      expect(res.code).toHaveBeenCalledWith(500);
    });

    it('does nothing', () => {
      state = fromJS({ redirection: { destination: null }, error: {} });
      checkStateForRedirectAndStatusCode(req, res);
      expect(res.redirect).not.toHaveBeenCalled();
      expect(res.code).not.toHaveBeenCalled();
    });

    it('should not allow redirects if the destination URL is not in the allow list', () => {
      state = fromJS({ redirection: { destination } });
      jest.spyOn(console, 'error');
      isRedirectUrlAllowed.mockImplementationOnce(() => false);
      checkStateForRedirectAndStatusCode(req, reply);
      expect(console.error).toHaveBeenCalledWith(`'${destination}' is not an allowed redirect URL`);
    });
  });

  describe('plugin', () => {
    describe('unwanted extension', () => {
      const app = Fastify();

      app.register(reactHtml);

      // eslint-disable-next-line no-shadow -- following Fastify's naming convention
      app.get('/*', (_request, reply) => {
        reply.sendHtml();
      });

      it('renders not found when url contains json', async () => {
        const response = await app.inject({
          method: 'get',
          url: '/test.json',
        });

        expect(response.statusCode).toBe(404);
        expect(response.body).toBe('Not found');
      });

      it('renders not found when url contains js', async () => {
        const response = await app.inject({
          method: 'get',
          url: '/test.js',
        });

        expect(response.statusCode).toBe(404);
        expect(response.body).toBe('Not found');
      });

      it('renders not found when url contains css', async () => {
        const response = await app.inject({
          method: 'get',
          url: '/test.css',
        });

        expect(response.statusCode).toBe(404);
        expect(response.body).toBe('Not found');
      });

      it('renders not found when url contains map', async () => {
        const response = await app.inject({
          method: 'get',
          url: '/test.map',
        });

        expect(response.statusCode).toBe(404);
        expect(response.body).toBe('Not found');
      });
    });

    it('calls the expected hooks to render pwa html shell', async () => {
      getServerPWAConfig.mockImplementationOnce(() => ({
        serviceWorker: true,
      }));

      request.url = '/_/pwa/shell';

      const fastify = {
        decorateRequest: jest.fn(),
        addHook: jest.fn(),
        decorateReply: jest.fn(),
      };
      const done = jest.fn();

      reactHtml(fastify, null, done);

      await fastify.addHook.mock.calls[0][1](request, reply);

      expect(fastify.addHook).toHaveBeenCalled();
      expect(createRequestStoreHook).toHaveBeenCalled();
      expect(conditionallyAllowCors).toHaveBeenCalled();
      expect(done).toHaveBeenCalled();
    });

    it('calls the expected hooks to render html', async () => {
      getServerPWAConfig.mockImplementationOnce(() => ({
        serviceWorker: false,
      }));

      const fastify = {
        decorateRequest: jest.fn(),
        addHook: jest.fn(),
        decorateReply: jest.fn(),
      };
      const done = jest.fn();

      reactHtml(fastify, null, done);

      await fastify.addHook.mock.calls[0][1](request, reply);

      expect(fastify.addHook).toHaveBeenCalled();
      expect(createRequestStoreHook).toHaveBeenCalled();
      expect(createRequestHtmlFragmentHook).toHaveBeenCalled();
      expect(conditionallyAllowCors).toHaveBeenCalled();
      expect(done).toHaveBeenCalled();
    });

    it('sendHtml reply decorator renders html', async () => {
      const fastify = {
        decorateRequest: jest.fn(),
        addHook: jest.fn(),
        decorateReply: jest.fn(),
      };
      const done = jest.fn();

      reactHtml(fastify, null, done);

      await fastify.decorateReply.mock.calls[0][1].bind(reply)(request, reply);

      expect(request.log.error).not.toHaveBeenCalled();

      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(reply.send.mock.calls[0][0]).toContain('<title>One App</title>');
    });
  });
});
