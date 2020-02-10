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

import React from 'react';
import ReactDOM from 'react-dom/server';

const templates = new Map();

export const SSR_SHELL_KEY = 'default';
export const templateAttrsPattern = /data-attrs="([{}A-Z_]*)"(>)/g;
export const templatePattern = /({{{[A-Z_]{1,}}}})/g;
export const templateTags = {
  doctype: '{{{DOC_TYPE}}}\n',
  appHtml: '{{{APP_HTML}}}',
  lang: '{{{LANG}}}',
  htmlAttrs: '{{{HTML_ATTRS}}}',
  headAttrs: '{{{HEAD_ATTRS}}}',
  bodyAttrs: '{{{BODY_ATTRS}}}',
  rootAttrs: '{{{ROOT_ATTRS}}}',
  head: '{{{HEAD}}}',
  title: '{{{DOCUMENT_TITLE}}}',
  base: '{{{BASE_TAG}}}',
  meta: '{{{META}}}',
  links: '{{{LINKS}}}',
  manifest: '{{{MANIFEST}}}',
  styles: '{{{STYLE_TAGS}}}',
  initialState: '{{{INITIAL_STATE}}}',
  scripts: '{{{SCRIPT_TAGS}}}',
};
export const tagDefaults = {
  doctype: () => '<!DOCTYPE html>',
  lang: () => 'en_US',
  rootAttrs: () => 'id="root"',
};

export function getTemplate(type = SSR_SHELL_KEY) {
  return templates.get(type);
}

export function setTemplate(type, template, tags = []) {
  templates.set(type, { template, tags });
  return getTemplate(type);
}

export function setTagDefault(tag, fn) {
  tagDefaults[tag] = fn;
  return tagDefaults;
}

export function renderToStaticMarkup(root, doctype = '') {
  return [doctype, ReactDOM.renderToStaticMarkup(root)].join('');
}

export function renderTemplate(type) {
  const tags = Object.keys(templateTags);
  let template = '';
  const templateType = type || SSR_SHELL_KEY;

  switch (templateType) {
    default:
    case SSR_SHELL_KEY: {
      template = renderToStaticMarkup(
        // eslint-disable-next-line jsx-a11y/html-has-lang
        <html data-attrs={templateTags.htmlAttrs}>
          <head data-attrs={templateTags.headAttrs}>
            {templateTags.head}
            {templateTags.title}
            {templateTags.base}
            {templateTags.meta}
            {templateTags.links}
            {templateTags.manifest}
            {templateTags.styles}
          </head>
          <body data-attrs={templateTags.bodyAttrs}>
            <div data-attrs={templateTags.rootAttrs}>
              {templateTags.appHtml}
            </div>
            {templateTags.initialState}
            {templateTags.scripts}
          </body>
        </html>,
        templateTags.doctype
      ).replace(templateAttrsPattern, '$1$2');
      break;
    }
  }

  if (!templates.has(templateType)) return setTemplate(templateType, template, tags);

  return { template, tags };
}

export function renderShell(replacements = {}, templateKey = SSR_SHELL_KEY, useDefaults = true) {
  const template = templates.get(templateKey) || renderTemplate(templateKey);

  const html = template.tags
    .map((key) => {
      const tag = templateTags[key];
      let value = replacements[key];
      if (!value && value !== null && useDefaults) value = tagDefaults[key] ? tagDefaults[key]() : '';
      if (typeof value === 'string') value = value.trim();
      else value = '';
      return [key, tag, value];
    })
    .reduce(
      // eslint-disable-next-line complexity
      (templateString, [key, tag, value]) => {
        const nextValue = value ? `${templateString.replace(tag, value).trim()}` : templateString;

        if (!value) {
          switch (key) {
            default:
              break;
            case 'appHtml': return nextValue;
            case 'rootAttrs':
            case 'bodyAttrs':
            case 'headAttrs':
            case 'htmlAttrs':
              return nextValue.replace(` ${tag}`, '').replace(/(?:\s*)data-attrs=".*"/, '');
          }
        } else {
          switch (key) {
            default:
              break;
            case 'rootAttrs':
            case 'bodyAttrs':
            case 'headAttrs':
            case 'htmlAttrs':
              return nextValue.replace(/(?:\s*)data-attrs=".*"/, '');
            case 'appHtml':
              return `\n${nextValue}\n`;
          }
        }

        return [nextValue, value && '\n'].join('');
      },
      template.template
    )
    .replace(templatePattern, '');

  return html;
}
