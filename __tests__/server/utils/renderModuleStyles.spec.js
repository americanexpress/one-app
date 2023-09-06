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

import { Map, Set as iSet, fromJS } from 'immutable';
import renderModuleStyles from '../../../src/server/utils/renderModuleStyles';

const getModuleWithMisconfiguredAggregatedStyles = (
  moduleName,
  includeCSS = true,
  includeDigest = true
) => {
  const moduleWithMisconfiguredAggregatedStyles = () => 0;

  const css = includeCSS && `.${moduleName}_deps { color: blue; }`;
  const digest = includeDigest && `${moduleName}_hash`;

  moduleWithMisconfiguredAggregatedStyles.ssrStyles = {
    aggregatedStyles: [{ css, digest }],
    getFullSheet: () => `.${moduleName}_class { color: red; }`,
  };
  return moduleWithMisconfiguredAggregatedStyles;
};

const getModuleWithAggregatedStyles = (moduleName, digest) => {
  const moduleWithAggregatedStyles = () => 0;
  moduleWithAggregatedStyles.ssrStyles = {
    aggregatedStyles: [
      { css: `.${moduleName}_deps { color: blue; }`, digest: `${digest || moduleName}_deps` },
      { css: `.${moduleName}_local { color: rebeccapurple; }`, digest: `${digest || moduleName}_local` },
    ],
    getFullSheet: () => `.${moduleName}_class { color: red; }`,
  };
  return moduleWithAggregatedStyles;
};

const getModuleWithStyles = (moduleName) => {
  const moduleWithStyles = () => 0;
  moduleWithStyles.ssrStyles = {
    getFullSheet: () => `.${moduleName}_class { color: red; }`,
  };
  return moduleWithStyles;
};

const moduleWithoutStyles = () => 0;

describe('renderModuleStyles', () => {
  it('should handle no modules being loaded', () => {
    const state = fromJS({ holocron: { loaded: iSet() } });
    const modules = new Map({ 'test-module': getModuleWithStyles('test-module') });
    const store = { getState: () => state, modules };
    expect(renderModuleStyles(store)).toBe('');
  });

  it('should handle modules without SSR styles', () => {
    const state = fromJS({ holocron: { loaded: iSet(['test-module']) } });
    const modules = new Map({ 'test-module': moduleWithoutStyles });
    const store = { getState: () => state, modules };
    expect(renderModuleStyles(store)).toBe('');
  });

  it('should handle modules with SSR styles', () => {
    const state = fromJS({ holocron: { loaded: iSet(['test-module']) } });
    const modules = new Map({ 'test-module': getModuleWithStyles('test-module') });
    const store = { getState: () => state, modules };
    expect(renderModuleStyles(store)).toMatchSnapshot();
  });

  it('should handle modules with aggregated SSR styles', () => {
    const state = fromJS({ holocron: { loaded: iSet(['test-module']) } });
    const modules = new Map({ 'test-module': getModuleWithAggregatedStyles('test-module') });
    const store = { getState: () => state, modules };
    expect(renderModuleStyles(store)).toMatchSnapshot();
  });

  it('should handle modules with misconfigured aggregated SSR styles', () => {
    const state = fromJS({ holocron: { loaded: iSet(['no-css', 'no-digest']) } });
    const modules = new Map({
      'no-css': getModuleWithMisconfiguredAggregatedStyles('no-css', false, true),
      'no-digest': getModuleWithMisconfiguredAggregatedStyles('no-digest', true, false),
    });
    const store = { getState: () => state, modules };
    expect(renderModuleStyles(store)).toBe('');
  });

  it('should handle a mix of modules with and without SSR styles', () => {
    const state = fromJS({
      holocron: {
        loaded: iSet(['test-module-a', 'test-module-b', 'test-module-c', 'test-module-d', 'test-module-e']),
      },
    });
    const modules = new Map({
      'test-module-a': moduleWithoutStyles,
      'test-module-b': getModuleWithStyles('test-module-b'),
      'test-module-c': moduleWithoutStyles,
      'test-module-d': getModuleWithStyles('test-module-d'),
      'test-module-e': getModuleWithAggregatedStyles('test-module-e'),
    });
    const store = { getState: () => state, modules };
    expect(renderModuleStyles(store)).toMatchSnapshot();
  });

  it('should deduplicate aggregatedStyles that have the same digest hash', () => {
    const state = fromJS({
      holocron: {
        loaded: iSet(['test-module-a', 'test-module-b', 'test-module-c']),
      },
    });
    const modules = new Map({
      'test-module-a': getModuleWithAggregatedStyles('test-module-a', 'shared_hash'),
      'test-module-b': getModuleWithAggregatedStyles('test-module-b', 'shared_hash'),
      'test-module-c': getModuleWithAggregatedStyles('test-module-c', 'unique-hash'),
    });
    const store = { getState: () => state, modules };
    expect(renderModuleStyles(store)).toMatchSnapshot();
  });

  it('should not send empty styles', () => {
    const state = fromJS({
      holocron: {
        loaded: iSet(['test-module-a', 'test-module-b', 'test-module-c', 'test-module-d']),
      },
    });
    const moduleWithEmptyStyles = () => 0;
    moduleWithEmptyStyles.ssrStyles = {
      getFullSheet: () => undefined,
    };
    const modules = new Map({
      'test-module-a': moduleWithoutStyles,
      'test-module-b': getModuleWithStyles('test-module-b'),
      'test-module-c': moduleWithEmptyStyles,
      'test-module-d': getModuleWithAggregatedStyles('test-module-d'),
    });
    const store = { getState: () => state, modules };
    expect(renderModuleStyles(store)).toMatchSnapshot();
  });
});
