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

import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import { loadLanguagePack } from '@americanexpress/one-app-ducks';
import { FormattedMessage, IntlProvider } from 'react-intl';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { holocronModule } from 'holocron';
import { fromJS } from 'immutable';

const OrderModuleChunk = React.lazy(() => import(/* webpackChunkName: 'Order' */ './Order'));

const FranksBurgers = ({
  languageData,
  localeName,
  moduleLoadStatus,
}) => (
  <IntlProvider locale={localeName} messages={languageData}>
    {(moduleLoadStatus === 'loaded' ? (
      <main>
        <header>
          <h1 id="franks-opening-line">
            <FormattedMessage id="franks-opening-line" />
          </h1>
        </header>

        <Suspense fallback={<p><FormattedMessage id="loading" /></p>}>
          <OrderModuleChunk />
        </Suspense>
      </main>
    ) : (
      <p><FormattedMessage id="loading" /></p>
    ))}
  </IntlProvider>
);

FranksBurgers.propTypes = {
  moduleLoadStatus: PropTypes.string.isRequired,
  localeName: PropTypes.string.isRequired,
  languageData: PropTypes.shape({
    loading: PropTypes.string,
    'franks-opening-line': PropTypes.string,
    'franks-cta': PropTypes.string,
    'franks-burger': PropTypes.string,
  }).isRequired,
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
