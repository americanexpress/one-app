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

import { getModule } from 'holocron';

/**
 * Generates a style tag with unique ID attribute per CSS file loaded.
 * @returns {string}
 */
const generateStyleTag = ({ css, digest }) => `
<style id="${digest}" data-ssr="true">
  ${css}
</style>`;

const generateServerStyleTag = (css) => `<style class="ssr-css">${css}</style>`;

const filterOutDuplicateDigests = (sheet, existingDigests) => sheet
  .filter(({ css, digest }) => css && digest && !existingDigests.has(digest));

const updateExistingDigests = (filteredSheets, existingDigests) => filteredSheets
  .forEach((sheet) => { existingDigests.add(sheet.digest); });

export default function renderModuleStyles(store) {
  const existingDigests = new Set();
  const modulesWithSSRStyles = store.getState().getIn(['holocron', 'loaded'], [])
    .map((moduleName) => getModule(moduleName, store.modules))
    .filter((module) => !!module.ssrStyles);

  const collatedStyles = modulesWithSSRStyles
    .reduce((acc, module) => {
      // Backwards compatibility for older bundles.
      if (!module.ssrStyles.aggregatedStyles) {
        const ssrStylesFullSheet = module.ssrStyles.getFullSheet();
        if (ssrStylesFullSheet) {
          acc.legacy.push({ css: ssrStylesFullSheet });
        }
        return acc;
      }

      const { aggregatedStyles } = module.ssrStyles;
      const uniqueStyles = filterOutDuplicateDigests(aggregatedStyles, existingDigests);
      updateExistingDigests(uniqueStyles, existingDigests);

      return {
        ...acc,
        aggregated: [
          ...acc.aggregated,
          ...uniqueStyles,
        ],
      };
    }, { aggregated: [], legacy: [] });

  return [...collatedStyles.legacy, ...collatedStyles.aggregated]
    .filter(Boolean)
    .reduce((acc, { css, digest }) => {
      if (!digest) {
        return acc + generateServerStyleTag(css);
      }

      return acc + generateStyleTag({ css, digest });
    }, '');
}
