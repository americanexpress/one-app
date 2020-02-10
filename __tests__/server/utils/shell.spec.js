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

import {
  tagDefaults,
  getTemplate,
  setTemplate,
  setTagDefault,
  renderToStaticMarkup,
  renderTemplate,
  renderShell,
} from '../../../src/server/utils/shell';

describe('shell', () => {
  it('should get and set a template', () => {
    expect.assertions(2);

    const tag = 'landing-page';
    const template = {
      tags: [],
      template: '',
    };

    expect(setTemplate(tag, template.template)).toEqual(template);
    expect(getTemplate(tag)).toEqual(template);
  });

  it('should be able to set functions for tag default handlers', () => {
    expect.assertions(1);

    const tag = 'head';
    const fn = () => '<link rel="favicon" href="favicon.ico"/>';

    expect(setTagDefault(tag, fn)).toEqual(tagDefaults);
  });

  it('should have functions for template tag defaults', () => {
    const defaults = Object.entries(tagDefaults);

    expect.assertions(defaults.length * 1);

    defaults.forEach(([tag, fn]) => {
      switch (tag) {
        default:
          expect(/^<.*>$/.test(fn())).toBe(true);
          break;
        case 'htmlAttrs':
        case 'headAttrs':
        case 'bodyAttrs':
        case 'rootAttrs':
          expect(/(?:[a-z-]).*=".*"/g.test(fn())).toBe(true);
          break;
        case 'lang':
          expect(/^(?:[a-z]).{1,2}_(?:[A-Z]).{1,2}$/g.test(fn())).toBe(true);
          break;
      }
    });
  });

  describe('rendering', () => {
    it('should render default html template and save it to memory', () => {
      expect.assertions(3);
      const html = renderTemplate();
      expect(html).toMatchSnapshot();
      expect(html).toEqual(getTemplate());
      expect(html).toEqual(renderTemplate());
    });

    it('should renderToStaticMarkup', () => {
      expect.assertions(2);
      const markup = renderToStaticMarkup();
      expect(markup).toMatchSnapshot();
      expect(markup).toBe('');
    });

    it('should render standard html', () => {
      expect.assertions(4);
      const markup = renderShell();
      expect(markup).toMatchSnapshot();
      expect(markup).toContain('<html');
      expect(markup).toContain('<head');
      expect(markup).toContain('<body');
    });

    it('should render added replacements', () => {
      expect.assertions(5);
      const appHtml = '<p>hi</p>';
      const markup = renderShell({
        appHtml,
      });
      expect(markup).toMatchSnapshot();
      expect(markup).toContain('<html');
      expect(markup).toContain('<head');
      expect(markup).toContain('<body');
      expect(markup).toContain(appHtml);
    });

    it('should render attributes', () => {
      expect.assertions(6);
      const rootAttrs = 'id="test-root"';
      const bodyAttrs = 'class="sparkle"';
      const htmlAttrs = 'lang="en-US"';
      const headAttrs = 'class="no-js"';
      const markup = renderShell({
        rootAttrs,
        bodyAttrs,
        htmlAttrs,
        headAttrs,
        head: '<title>One App</title>',
      }, 'performance-attrs');
      expect(markup).toMatchSnapshot();
      expect(markup).toContain(`<html ${htmlAttrs}`);
      expect(markup).toContain(`<head ${headAttrs}`);
      expect(markup).toContain(`<body ${bodyAttrs}`);
      expect(markup).toContain(`<div ${rootAttrs}`);
      expect(renderShell({
        rootAttrs,
        bodyAttrs,
        htmlAttrs,
        headAttrs,
        head: '<title>One App</title>',
      }, 'performance-attrs')).toMatchSnapshot();
    });

    it('should not render attributes', () => {
      expect.assertions(6);
      const rootAttrs = null;
      const bodyAttrs = null;
      const htmlAttrs = null;
      const headAttrs = null;
      const markup = renderShell({
        rootAttrs,
        bodyAttrs,
        htmlAttrs,
        headAttrs,
        head: '<title>One App</title>',
      }, 'performance-attrs');
      expect(markup).toMatchSnapshot();
      expect(markup).toContain('<html>');
      expect(markup).toContain('<head>');
      expect(markup).toContain('<body>');
      expect(markup).toContain('<body><div>');
      expect(renderShell({
        rootAttrs,
        bodyAttrs,
        htmlAttrs,
        headAttrs,
        head: '<title>One App</title>',
      }, 'performance-attrs')).toMatchSnapshot();
    });
  });
});
