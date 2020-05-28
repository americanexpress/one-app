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
import { fromJS } from 'immutable';
import ModuleRoute from 'holocron-module-route';
import { Helmet } from 'react-helmet';
import { connect } from 'react-redux';
import HelloWorldComponent from './HelloWorld';

export function FrankLloydRoot({ children, config }) {
  return (
    <React.Fragment>
      <Helmet
        title="Sample Root Module"
        link={[
          { rel: 'icon', href: 'https://sample-cdn.frank/favicon.ico' },
        ]}
      />
      <pre>{config}</pre>
      { children }
    </React.Fragment>
  );
}

FrankLloydRoot.childRoutes = () => [
  <ModuleRoute path="success" component={HelloWorldComponent} />,
];

FrankLloydRoot.propTypes = {
  children: PropTypes.node.isRequired,
  config: PropTypes.shape({}).isRequired,
};

if (!global.BROWSER) {
  FrankLloydRoot.appConfig = {
    eventLoopDelayThreshold: Infinity,
    // eslint-disable-next-line global-require
    csp: require('../csp').default,
    provideStateConfig: {
      someApiUrl: {
        client: {
          development: 'https://internet-origin-dev.example.com/some-api/v1',
          qa: 'https://internet-origin-qa.example.com/some-api/v1',
          production: 'https://internet-origin.example.com/some-api/v1',
        },
      },
    },
  };
}

const reducer = (state = fromJS({})) => state;
reducer.buildInitialState = ({ req } = {}) => {
  if (req && req.body) {
    return fromJS({ postProps: req.body });
  }
  return fromJS({});
};

export default connect((state) => ({ config: state.get('config') }))(FrankLloydRoot);
