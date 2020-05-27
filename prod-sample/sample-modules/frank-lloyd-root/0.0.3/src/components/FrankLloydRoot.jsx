/* eslint-disable global-require */
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
import ImmutablePropTypes from 'react-immutable-proptypes';
import { fromJS } from 'immutable';
import ModuleRoute from 'holocron-module-route';
import { Helmet } from 'react-helmet';
import { connect } from 'react-redux';
import HelloWorldComponent from './HelloWorld';

export function FrankLloydRoot({ children, config }) {
  const cdnUrl = React.useMemo(() => config.get('cdnUrl'), [config]);
  return (
    <React.Fragment>
      <Helmet
        title="Frank Lloyd Root"
        meta={[
          { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
          { name: 'description', content: 'A Progressive Web App ready Holocron Module' },
          { name: 'theme-color', content: '#FDB92D' },
        ]}
        link={[
          // favicon
          { rel: 'icon', href: `${cdnUrl}modules/frank-lloyd-root/0.0.3/assets/pwa-icon-192px.png` },
          // icon ideally with a size of 192px (or 180px), it is added as the home icon
          { rel: 'apple-touch-icon', href: `${cdnUrl}modules/frank-lloyd-root/0.0.3/assets/pwa-icon-180px.png` },
        ]}
      />
      <pre className="value-provided-from-config">{ config.get('someApiUrl') }</pre>
      { children }
    </React.Fragment>
  );
}

FrankLloydRoot.childRoutes = () => [
  <ModuleRoute path="vitruvius" moduleName="vitruvius-franklin" />,
  <ModuleRoute path="/success" component={HelloWorldComponent} />,
  <ModuleRoute path="healthy-frank" moduleName="healthy-frank" />,
  <ModuleRoute path="demo/:moduleName" moduleName="preview-frank" />,
];

FrankLloydRoot.propTypes = {
  children: PropTypes.node.isRequired,
  config: ImmutablePropTypes.map.isRequired,
};

if (!global.BROWSER) {
  // eslint-disable-next-line global-require
  FrankLloydRoot.appConfig = require('../config').default;
}

const reducer = (state = fromJS({})) => state;

FrankLloydRoot.holocron = {
  name: 'frank-lloyd-root',
  reducer,
};

export default connect((state) => ({ config: state.get('config') }))(FrankLloydRoot);
