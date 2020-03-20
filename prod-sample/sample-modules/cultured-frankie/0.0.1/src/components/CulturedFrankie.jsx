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

import React from 'react';
import PropTypes from 'prop-types';
import { loadLanguagePack, updateLocale } from '@americanexpress/one-app-ducks';
import { FormattedMessage, IntlProvider } from 'react-intl';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { holocronModule } from 'holocron';
import { fromJS } from 'immutable';

const CulturedFrankie = ({ switchLanguage, languageData, localeName }) => {
  const locales = ['en-US', 'en-CA', 'es-MX'];

  return (
    <IntlProvider locale={localeName} messages={languageData}>
      <div>
        <span id="greeting-message">
          <FormattedMessage id="greeting" />
        </span>
        <div>
          <label htmlFor="locale-selector">
            Choose a locale:
            <select name="locale" id="locale-selector" onChange={switchLanguage}>
              {locales.map((locale) => <option key={locale} value={locale}>{locale}</option>
              )}
            </select>
          </label>
        </div>
      </div>
    </IntlProvider>
  );
};

CulturedFrankie.propTypes = {
  switchLanguage: PropTypes.func.isRequired,
  languageData: PropTypes.shape({
    greeting: PropTypes.string.isRequired,
  }).isRequired,
  localeName: PropTypes.string.isRequired,
};

const mapDispatchToProps = (dispatch) => ({
  switchLanguage: async ({ target }) => {
    await dispatch(updateLocale(target.value));
    await dispatch(loadLanguagePack('cultured-frankie'));
  },
});

const mapStateToProps = (state) => {
  const localeName = state.getIn(['intl', 'activeLocale']);
  const languagePack = state.getIn(
    ['intl', 'languagePacks', localeName, 'cultured-frankie'],
    fromJS({})
  ).toJS();

  return {
    languageData: languagePack && languagePack.data ? languagePack.data : {},
    localeName,
  };
};

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  holocronModule({
    name: 'cultured-frankie',
    load: () => (dispatch) => dispatch(loadLanguagePack('cultured-frankie', { fallbackLocale: 'en-US' })),
    options: { ssr: true },
  })
)(CulturedFrankie);
