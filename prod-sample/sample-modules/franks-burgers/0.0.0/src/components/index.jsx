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
import PropTypes from 'prop-types';
import { loadLanguagePack } from '@americanexpress/one-app-ducks';
import { FormattedMessage, IntlProvider } from 'react-intl';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { holocronModule } from 'holocron';
import { fromJS } from 'immutable';

import {
  Bacon,
  Cheese,
  Ketchup,
  Lettuce,
  Mustard,
  Onions,
  Patty,
  Pickles,
  Tomato,
  VeggiePatty,
} from './ingredients';

const FranksBurgers = ({ languageData, localeName }) => (Object.keys(languageData).length > 0 ? (
  <IntlProvider locale={localeName} messages={languageData}>
    <main>
      <header>
        <h1 id="franks-opening-line">
          <FormattedMessage id="franks-opening-line" />
        </h1>
      </header>

      <section>
        <header>
          <h2 id="franks-menu">
            <FormattedMessage id="franks-menu" />
          </h2>

        </header>

        <article>
          <header>
            <h3 id="franks-ingredients">
              <FormattedMessage id="franks-ingredients" />
            </h3>
          </header>

          <button id="ingredient-bun-top" type="button">
            <FormattedMessage id="BunTop" />
          </button>

          <ul id="ingredients-list">
            {React.Children.toArray([
              <Mustard />,
              <Ketchup />,
              <Cheese />,
              <Bacon />,
              <Lettuce />,
              <Tomato />,
              <Onions />,
              <Pickles />,
              <VeggiePatty />,
              <Patty />,
            ].map((child) => (
              <li>
                {child}
              </li>
            )))}
          </ul>

          <button id="ingredient-bun-bottom" type="button">
            <FormattedMessage id="BunBottom" />
          </button>
        </article>

        <footer>
          <header>
            <h4 id="franks-cta">
              <FormattedMessage id="franks-cta" />
            </h4>

            <button id="franks-cta-action" type="button">
              <FormattedMessage id="franks-cta-action" />
            </button>
          </header>
        </footer>
      </section>

      <footer>
        <h3 id="franks-guarantee">
          <FormattedMessage id="franks-guarantee" />
        </h3>

        <h4 id="franks-delivery-policy">
          <FormattedMessage id="franks-delivery-policy" />
        </h4>
      </footer>
    </main>
  </IntlProvider>
) : (
  <p>Loading...</p>
));

FranksBurgers.propTypes = {
  languageData: PropTypes.shape({
    loading: PropTypes.string,
    'franks-opening-line': PropTypes.string,
    'franks-menu': PropTypes.string,
    'franks-ingredients': PropTypes.string,
    'franks-cta': PropTypes.string,
    'franks-cta-action': PropTypes.string,
    'franks-guarantee': PropTypes.string,
    'franks-delivery-policy': PropTypes.string,
    Bacon: PropTypes.string,
    BunTop: PropTypes.string,
    BunBottom: PropTypes.string,
    Cheese: PropTypes.string,
    Ketchup: PropTypes.string,
    Lettuce: PropTypes.string,
    Mustard: PropTypes.string,
    Onions: PropTypes.string,
    Patty: PropTypes.string,
    Pickles: PropTypes.string,
    SourCream: PropTypes.string,
    Tomato: PropTypes.string,
    VeggiePatty: PropTypes.string,
  }).isRequired,
  localeName: PropTypes.string.isRequired,
};

const mapStateToProps = (state) => {
  const localeName = state.getIn(['intl', 'activeLocale']);
  const languagePack = state.getIn(
    ['intl', 'languagePacks', localeName, 'franks-burgers'],
    fromJS({})
  ).toJS();

  return {
    languageData: languagePack && languagePack.data ? languagePack.data : {},
    localeName,
  };
};

export default compose(
  connect(mapStateToProps),
  holocronModule({
    name: 'franks-burgers',
    load: () => (dispatch) => dispatch(loadLanguagePack('franks-burgers', { fallbackLocale: 'en-US' })),
    options: { ssr: true },
  })
)(FranksBurgers);
