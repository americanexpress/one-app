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

import { fromJS } from 'immutable';
import sendHtml, {
  renderStaticErrorPage,
  renderModuleScripts,
  safeSend,
} from '../../../src/server/middleware/sendHtml';
// _client is a method to control the mock
// eslint-disable-next-line import/named
import { getClientStateConfig } from '../../../src/server/utils/stateConfig';
// _setVars is a method to control the mock
// eslint-disable-next-line import/named
import transit from '../../../src/universal/utils/transit';
import { setClientModuleMapCache, getClientModuleMapCache } from '../../../src/server/utils/clientModuleMapCache';
import { getClientPWAConfig } from '../../../src/server/middleware/pwa';

jest.mock('react-helmet');
jest.mock('holocron', () => ({
  getModule: () => {
    const module = () => 0;
    module.ssrStyles = {};
    module.ssrStyles.getFullSheet = () => '.class { background: red; }';
    return module;
  },
}));
jest.mock('../../../src/server/utils/stateConfig');
jest.mock('../../../src/server/utils/readJsonFile', () => (filePath) => {
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
jest.mock('../../../src/server/middleware/pwa', () => ({
  getClientPWAConfig: jest.fn(() => ({
    serviceWorker: false,
    serviceWorkerScope: null,
    serviceWorkerScriptUrl: null,
  })),
}));
jest.mock('../../../src/universal/ducks/config');
jest.mock('../../../src/universal/utils/transit', () => ({
  toJSON: jest.fn(() => 'serialized in a string'),
}));

jest.spyOn(console, 'info').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('sendHtml', () => {
  const appHtml = '<p>Why, hello!</p>';

  let req;
  let res;

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
    req.clientModuleMapCache = getClientModuleMapCache();
  };

  beforeEach(() => {
    setClientModuleMapCache({
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
    jest.resetModules();
    jest.clearAllMocks();
    req = jest.fn();
    req.headers = {
      // we need a legitimate user-agent string here to test between modern and legacy browsers
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36',
    };

    res = jest.fn();
    res.status = jest.fn(() => res);
    res.send = jest.fn(() => res);
    res.redirect = jest.fn(() => res);
    res.end = jest.fn(() => res);
    req.url = 'http://example.com/request';
    req.store = {
      dispatch: jest.fn(),
      getState: jest.fn(() => fromJS({
        holocron: fromJS({
          loaded: ['test-root'],
        }),
        intl: fromJS({ activeLocale: 'en-US' }),
        rendering: fromJS({}),
      })),
    };
    req.clientModuleMapCache = getClientModuleMapCache();
    req.appHtml = appHtml;

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

  describe('middleware', () => {
    it('sends a rendered page', () => {
      sendHtml(req, res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(res.send.mock.calls[0][0]).toContain('<title>One App</title>');

      expect(res.send.mock.calls[0][0]).toContain(appHtml);
      expect(res.send.mock.calls[0][0]).toContain(
        'window.__webpack_public_path__ = "/cdnUrl/app/1.2.3-rc.4-abc123/";'
      );
      expect(res.send.mock.calls[0][0]).toContain(
        'window.__holocron_module_bundle_type__ = \'browser\';'
      );
      expect(res.send.mock.calls[0][0]).toContain(
        'window.__CLIENT_HOLOCRON_MODULE_MAP__ = {"modules":{"test-root":{"baseUrl":"https://example.com/cdn/test-root/2.2.2/","browser":{"url":"https://example.com/cdn/test-root/2.2.2/test-root.browser.js","integrity":"nggdfhr34"}}}};'
      );
      expect(removeInitialState(res.send.mock.calls[0][0])).not.toContain('undefined');
    });

    it('sends a rendered page with the __holocron_module_bundle_type__ global set according to the user agent and the client module map that only includes the relevant details', () => {
      req.headers['user-agent'] = 'Browser/5.0 (compatible; NUEI 100.0; Doors TX 81.4; Layers/1.0)';
      sendHtml(req, res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(res.send.mock.calls[0][0]).toContain('<title>One App</title>');

      expect(res.send.mock.calls[0][0]).toContain(appHtml);
      expect(res.send.mock.calls[0][0]).toContain(
        'window.__holocron_module_bundle_type__ = \'legacyBrowser\';'
      );
      expect(res.send.mock.calls[0][0]).toContain(
        'window.__CLIENT_HOLOCRON_MODULE_MAP__ = {"modules":{"test-root":{"baseUrl":"https://example.com/cdn/test-root/2.2.2/","legacyBrowser":{"url":"https://example.com/cdn/test-root/2.2.2/test-root.legacy.browser.js","integrity":"7567ee"}}}};'
      );
      expect(removeInitialState(res.send.mock.calls[0][0])).not.toContain('undefined');
    });

    it('sends a rendered page with defaults', () => {
      getClientStateConfig.mockImplementation(() => ({}));
      sendHtml(req, res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(res.send.mock.calls[0][0]).toContain('<title>One App</title>');
      expect(res.send.mock.calls[0][0]).toContain(appHtml);
      expect(res.send.mock.calls[0][0]).toContain(
        'window.__webpack_public_path__ = "/_/static/app/1.2.3-rc.4-abc123/";'
      );
      expect(removeInitialState(res.send.mock.calls[0][0])).not.toContain('undefined');
    });

    it('sends a rendered page with helmet info', () => {
      req.helmetInfo = {
        htmlAttributes: { toString: jest.fn(() => 'htmlAttributes') },
        bodyAttributes: { toString: jest.fn(() => 'bodyAttributes') },
        title: { toString: jest.fn(() => '<title>title</title>') },
        meta: { toString: jest.fn(() => '<meta>') },
        style: { toString: jest.fn(() => '<style>.style</style>') },
        script: { toString: jest.fn(() => '<script>/*script*/</script>') },
        link: { toString: jest.fn(() => '<link rel="stylesheet" />') },
        base: { toString: jest.fn(() => '<base>') },
      };
      sendHtml(req, res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(res.send.mock.calls[0][0]).toContain('<html htmlAttributes>');

      expect(res.send.mock.calls[0][0]).not.toContain('<title>One App</title>');
      expect(res.send.mock.calls[0][0]).toContain('<title>title</title>');

      expect(res.send.mock.calls[0][0]).toContain('<meta>');
      expect(res.send.mock.calls[0][0]).toContain('<body bodyAttributes>');
      expect(res.send.mock.calls[0][0]).toContain('<style>.style</style>');
      expect(res.send.mock.calls[0][0]).toContain('<script>/*script*/</script>');
      expect(res.send.mock.calls[0][0]).toContain('<link rel="stylesheet" />');
      expect(res.send.mock.calls[0][0]).toContain('<base>');

      expect(removeInitialState(res.send.mock.calls[0][0])).not.toContain('undefined');
    });

    it('sends a rendered page with the one-app script tags', () => {
      sendHtml(req, res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('<script src="/cdnUrl/app/1.2.3-rc.4-abc123/bundle~common.js" integrity="1234" crossorigin="anonymous"></script>');
      expect(res.send.mock.calls[0][0]).toContain('<script src="/cdnUrl/app/1.2.3-rc.4-abc123/app.js" integrity="098" crossorigin="anonymous"></script>');
    });

    it('sends a rendered page with the legacy app bundle according to the user agent', () => {
      req.headers['user-agent'] = 'Browser/5.0 (compatible; NUEI 100.0; Doors TX 81.4; Layers/1.0)';
      sendHtml(req, res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('<script src="/cdnUrl/app/1.2.3-rc.4-abc123/legacy/bundle~common.js" integrity="abc" crossorigin="anonymous"></script>');
      expect(res.send.mock.calls[0][0]).toContain('<script src="/cdnUrl/app/1.2.3-rc.4-abc123/legacy/app.js" integrity="zyx" crossorigin="anonymous"></script>');
    });

    it('sends a rendered page with the locale data script tag', () => {
      sendHtml(req, res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('<script src="/cdnUrl/app/1.2.3-rc.4-abc123/i18n/en-US.js"');
    });

    it('sends a rendered page without the locale data script tag when the activeLocale is not known', () => {
      setFullMap();
      req.store = {
        dispatch: jest.fn(),
        getState: jest.fn(() => fromJS({
          holocron: fromJS({
            loaded: ['a'],
          }),
          intl: fromJS({ activeLocale: 'tlh' }),
          rendering: fromJS({}),
        })),
      };
      sendHtml(req, res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).not.toContain('src="/cdnUrl/app/1.2.3-rc.4-abc123/i18n/');
    });

    it('sends a rendered page with the module styles and scripts', () => {
      sendHtml(req, res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain(
        '<style class="ssr-css">.class { background: red; }</style>'
      );
      expect(res.send.mock.calls[0][0]).toContain(
        '<script src="/cdnUrl/app/1.2.3-rc.4-abc123/i18n/en-US.js" crossorigin="anonymous"></script>'
      );
      expect(res.send.mock.calls[0][0]).toContain(
        '<script src="/cdnUrl/app/1.2.3-rc.4-abc123/bundle~common.js" integrity="1234" crossorigin="anonymous"></script>'
      );
      expect(res.send.mock.calls[0][0]).toContain(
        '<script src="/cdnUrl/app/1.2.3-rc.4-abc123/app.js" integrity="098" crossorigin="anonymous"></script>'
      );
      expect(res.send.mock.calls[0][0]).toContain(
        '<script src="https://example.com/cdn/test-root/2.2.2/test-root.browser.js'
      );
    });


    it('sends the static error page when the store malfunctions', () => {
      req.store = {
        getState: jest.fn(() => { throw new Error('cannot get state'); }),
      };
      /* eslint-disable no-console */
      sendHtml(req, res);
      expect(console.error).toHaveBeenCalled();
      /* eslint-enable no-console */
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(res.send.mock.calls[0][0]).toContain('<meta name="application-name" content="one-app">');
      expect(removeInitialState(res.send.mock.calls[0][0])).not.toContain('undefined');
    });

    it('sends the static error page when appHtml is not a string', () => {
      req.appHtml = [1, 2, 3];
      /* eslint-disable no-console */
      sendHtml(req, res);
      expect(console.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(removeInitialState(res.send.mock.calls[0][0])).not.toContain('undefined');
      /* eslint-enable no-console */
    });

    it('sends a page with an empty div#root when appHtml is undefined', () => {
      delete req.appHtml;
      sendHtml(req, res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(res.send.mock.calls[0][0]).not.toContain(appHtml);
      expect(res.send.mock.calls[0][0]).toContain('<div id="root"></div>');
    });

    it('includes scriptNonce when provided', () => {
      res.scriptNonce = '54321';
      sendHtml(req, res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(/<script.*nonce="54321"/.test(res.send.mock.calls[0][0])).toBe(true);
    });

    describe('PWA config rendering', () => {
      it('includes __pwa_metadata__ with disabled values', () => {
        sendHtml(req, res);
        expect(res.send).toHaveBeenCalledTimes(1);
        expect(/window\.__pwa_metadata__ = {"serviceWorker":false,"serviceWorkerScope":null,"serviceWorkerScriptUrl":null};/.test(res.send.mock.calls[0][0])).toBe(true);
      });

      it('includes __pwa_metadata__ with enabled values', () => {
        getClientPWAConfig.mockImplementationOnce(() => ({
          serviceWorker: true,
          serviceWorkerScope: '/',
          serviceWorkerScriptUrl: '/sw.js',
        }));
        sendHtml(req, res);
        expect(res.send).toHaveBeenCalledTimes(1);
        expect(/window\.__pwa_metadata__ = {"serviceWorker":true,"serviceWorkerScope":"\/","serviceWorkerScriptUrl":"\/sw\.js"};/.test(res.send.mock.calls[0][0])).toBe(true);
      });
    });

    describe('renderPartialOnly', () => {
      beforeEach(() => {
        req.store = {
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

      afterEach(() => { req.appHtml = appHtml; });

      it('sends an incomplete HTML document with styles', () => {
        sendHtml(req, res);
        expect(res.send).toHaveBeenCalledTimes(1);
        expect(res.send.mock.calls[0][0]).not.toContain('<!DOCTYPE html>');
        expect(res.send.mock.calls[0][0]).not.toContain('<title>One App</title>');

        expect(res.send.mock.calls[0][0]).toBe(`<style class="ssr-css">.class { background: red; }</style>${appHtml}`);
        expect(removeInitialState(res.send.mock.calls[0][0])).not.toContain('undefined');
      });

      it('sends an complete HTML document with styles in the head', () => {
        req.appHtml = `<dangerously-return-only-doctype><!doctype html><html><head><title>Some Title</title></head>${appHtml}</html></dangerously-return-only-doctype>`;
        sendHtml(req, res);
        expect(res.send).toHaveBeenCalledTimes(1);
        expect(res.send.mock.calls[0][0]).not.toContain('<!DOCTYPE html>');
        expect(res.send.mock.calls[0][0]).not.toContain('<title>One App</title>');

        expect(res.send.mock.calls[0][0]).toBe(`<!doctype html><html><head><title>Some Title</title><style class="ssr-css">.class { background: red; }</style></head>${appHtml}</html>`);
        expect(removeInitialState(res.send.mock.calls[0][0])).not.toContain('undefined');
      });
    });

    describe('disableScripts', () => {
      beforeEach(() => {
        req.store = {
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
        sendHtml(req, res);
        expect(res.send).toHaveBeenCalledTimes(1);
        expect(res.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
        expect(res.send.mock.calls[0][0]).toContain('<title>One App</title>');

        expect(res.send.mock.calls[0][0]).toContain(appHtml);
        expect(removeInitialState(res.send.mock.calls[0][0])).not.toContain('undefined');
      });

      it('prevents global state from being added to rendered page', () => {
        sendHtml(req, res);
        expect(res.send.mock.calls[0][0]).not.toContain('window.__webpack_public_path__');
        expect(res.send.mock.calls[0][0]).not.toContain('window.__holocron_modules_path__');
        expect(res.send.mock.calls[0][0]).not.toContain('window.__INITIAL_STATE__');
      });

      it('prevents all scripts from being added to rendered page', () => {
        req.helmetInfo = {
          htmlAttributes: { toString: jest.fn(() => 'htmlAttributes') },
          bodyAttributes: { toString: jest.fn(() => 'bodyAttributes') },
          title: { toString: jest.fn(() => '<title>title</title>') },
          meta: { toString: jest.fn(() => '<meta>') },
          style: { toString: jest.fn(() => '<style>.style</style>') },
          script: { toString: jest.fn(() => '<script>/*script*/</script>') },
          link: { toString: jest.fn(() => '<link rel="stylesheet" /><link rel="icon" href="favicon.ico" />') },
          base: { toString: jest.fn(() => '<base>') },
        };
        sendHtml(req, res);
        expect(res.send.mock.calls[0][0]).not.toContain('<script');
      });
    });

    describe('disableStyles', () => {
      beforeEach(() => {
        req.store = {
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
        req.clientModuleMapCache = getClientModuleMapCache();
        process.env.NODE_ENV = 'production';
        req.helmetInfo = {
          htmlAttributes: { toString: jest.fn(() => 'htmlAttributes') },
          bodyAttributes: { toString: jest.fn(() => 'bodyAttributes') },
          title: { toString: jest.fn(() => '<title>title</title>') },
          meta: { toString: jest.fn(() => '<meta>') },
          style: { toString: jest.fn(() => '<style>.style</style>') },
          script: { toString: jest.fn(() => '<script>/*script*/</script>') },
          link: { toString: jest.fn(() => '<link rel="stylesheet" /><link rel="icon" href="favicon.ico" />') },
          base: { toString: jest.fn(() => '<base>') },
        };
        sendHtml(req, res);
        expect(res.send.mock.calls[0][0]).not.toContain('<link rel="stylesheet"');
        expect(res.send.mock.calls[0][0]).toContain('<link rel="icon" href="favicon.ico" />');
      });

      it('prevents all style tags from being added to the rendered page', () => {
        process.env.NODE_ENV = 'production';
        req.helmetInfo = {
          htmlAttributes: { toString: jest.fn(() => 'htmlAttributes') },
          bodyAttributes: { toString: jest.fn(() => 'bodyAttributes') },
          title: { toString: jest.fn(() => '<title>title</title>') },
          meta: { toString: jest.fn(() => '<meta>') },
          style: { toString: jest.fn(() => '<style>.style</style>') },
          script: { toString: jest.fn(() => '<script>/*script*/</script>') },
          link: { toString: jest.fn(() => '<link rel="stylesheet" /><link rel="icon" href="favicon.ico" />') },
          base: { toString: jest.fn(() => '<base>') },
        };
        sendHtml(req, res);
        expect(res.send.mock.calls[0][0]).not.toContain('<style');
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
        clientInitialState: req.store.getState(),
        moduleMap: clientModuleMapCache.browser,
        isDevelopmentEnv: false,
        bundle: 'browser',
      })).toMatchSnapshot();
    });

    it('does not add cache busting clientCacheRevision from module map to each module script src if NODE_ENV is development', () => {
      expect(renderModuleScripts({
        clientInitialState: req.store.getState(),
        moduleMap: clientModuleMapCache.browser,
        isDevelopmentEnv: true,
        bundle: 'browser',
      })).toMatchSnapshot();
    });

    it('does not add cache busting clientCacheRevision if not present', () => {
      const moduleMap = { ...clientModuleMapCache.browser };
      delete moduleMap.clientCacheRevision;
      expect(renderModuleScripts({
        clientInitialState: req.store.getState(),
        moduleMap,
        isDevelopmentEnv: false,
        bundle: 'browser',
      })).toMatchSnapshot();
    });

    it('sends a rendered page with cross origin scripts', () => {
      expect(renderModuleScripts({
        clientInitialState: req.store.getState(),
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

      sendHtml(req, res);
      /* eslint-disable no-console */
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith('encountered an error serializing full client initial state', fullStateError);
      /* eslint-enable no-console */
      expect(transit.toJSON).toHaveBeenCalledTimes(3);

      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');

      expect(res.send.mock.calls[0][0]).toContain(appHtml);
      expect(res.send.mock.calls[0][0]).toContain(
        'window.__webpack_public_path__ = "/cdnUrl/app/1.2.3-rc.4-abc123/";'
      );
      expect(res.send.mock.calls[0][0]).toContain(
        'window.__INITIAL_STATE__ = "serialized bare state possible";'
      );
      expect(removeInitialState(res.send.mock.calls[0][0])).not.toContain('undefined');
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

      sendHtml(req, res);
      /* eslint-disable no-console */
      expect(console.error).toHaveBeenCalledTimes(3);
      expect(console.error).toHaveBeenCalledWith('encountered an error serializing full client initial state', fullStateError);
      expect(console.error).toHaveBeenCalledWith('unable to build the most basic initial state for a client to startup', minimalStateError);
      /* eslint-enable no-console */
      expect(transit.toJSON).toHaveBeenCalledTimes(4);

      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(res.send.mock.calls[0][0]).toContain('<title>One App</title>');

      expect(res.send.mock.calls[0][0]).not.toContain(appHtml);
      expect(res.send.mock.calls[0][0]).toContain(
        'Sorry, we are unable to load this page at this time. Please try again later.'
      );
    });
  });

  describe('renderStaticErrorPage', () => {
    it('sends default static error page', () => {
      renderStaticErrorPage(res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(res.send.mock.calls[0][0]).toContain('<meta name="application-name" content="one-app">');
    });

    it('sets the status code to 500 if not already set', () => {
      delete res.statusCode;
      renderStaticErrorPage(res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('does not change the status code if already set', () => {
      res.statusCode = 400;
      renderStaticErrorPage(res);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('invites the user to try again if the status code is 5xx level', () => {
      res.statusCode = 500;
      renderStaticErrorPage(res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('Sorry, we are unable to load this page at this time. Please try again later.');
    });

    it('invites the user to try again if the status code is 404', () => {
      res.statusCode = 404;
      renderStaticErrorPage(res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('Sorry, we are unable to load this page at this time. Please try again later.');
    });

    it('does not invite the user to try again if the status code is 4xx level and not 404', () => {
      res.statusCode = 400;
      renderStaticErrorPage(res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('Sorry, we are unable to load this page at this time.');
      expect(res.send.mock.calls[0][0]).not.toContain('Please try again later.');
    });

    it('does not send any serializations of non-strings', () => {
      renderStaticErrorPage(res);
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send.mock.calls[0][0]).toContain('<!DOCTYPE html>');
      expect(res.send.mock.calls[0][0]).not.toMatch('[object ');
      expect(res.send.mock.calls[0][0]).not.toContain('undefined');
    });
  });
  describe('safeSend', () => {
    it('should res.send if no headers were sent', () => {
      const fakeRes = {
        headersSent: false,
        send: jest.fn(),
      };
      safeSend(fakeRes, 'stuff');
      expect(fakeRes.send).toHaveBeenCalledWith('stuff');
    });
    it('should do nothing if headers were already sent', () => {
      const fakeRes = {
        headersSent: true,
        send: jest.fn(),
      };
      safeSend(fakeRes, 'stuff');
      expect(fakeRes.send).not.toHaveBeenCalled();
    });
  });
});
