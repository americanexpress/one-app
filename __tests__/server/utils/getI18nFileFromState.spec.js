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

const mockBuildMetaFile = jest.requireActual('../../../.build-meta.json');

describe('getI18nFileFromState', () => {
  let getI18nFileFromState;
  let readJsonFile;

  function load() {
    jest.mock('../../../src/server/utils/readJsonFile', () => jest.fn(() => mockBuildMetaFile));
    readJsonFile = require('../../../src/server/utils/readJsonFile');

    getI18nFileFromState = require('../../../src/server/utils/getI18nFileFromState').default;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  // would like to add a spec
  // 'does not store one-app/.webpack-stats.client.json in the require cache'
  // but how do you check the calls to the `require` function given to the file?
  // it's different than our instance and it's not a global
  // switching from `readJsonFile` to `require` still results in `require.cache` as an empty object

  it('uses one-app/.build-meta.json', () => {
    load();
    expect(readJsonFile).toHaveBeenCalledTimes(1);
    expect(readJsonFile.mock.calls[0]).toEqual(['../../../.build-meta.json']);
  });

  it('returns null when the active locale is not in the list of i18n files', () => {
    load();
    const clientInitialState = fromJS({
      intl: { activeLocale: 'tlh' },
    });
    expect(getI18nFileFromState(clientInitialState)).toBe(null);
  });

  it('returns the file for a locale', () => {
    load();
    const clientInitialState = fromJS({
      intl: { activeLocale: 'en-US' },
    });
    expect(getI18nFileFromState(clientInitialState)).toBe('i18n/en-US.js');
  });

  describe('intl global duck locale', () => {
    const locales = ['en-XA', 'en-XB', 'zh-TW', 'en-BH', 'es-ES', 'nb-NO', 'nl-NL', 'nl-BE'];
    locales.forEach((locale) => {
      it(`${locale} has a file`, () => {
        load();
        const clientInitialState = fromJS({
          intl: { activeLocale: locale },
        });
        expect(getI18nFileFromState(clientInitialState)).toMatch(/^i18n\/[a-z\d-]+\.js$/i);
      });

      it(`${locale} has the right file`, () => {
        load();
        const clientInitialState = fromJS({
          intl: { activeLocale: locale },
        });
        expect(getI18nFileFromState(clientInitialState)).toMatchSnapshot();
      });
    });
  });
});
