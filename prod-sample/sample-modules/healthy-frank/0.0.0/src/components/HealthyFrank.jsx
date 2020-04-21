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
import ModuleRoute, { moduleRoutePrefetch } from 'holocron-module-route';
import PropTypes from 'prop-types';
import { Link, Route, IndexRedirect } from '@americanexpress/one-app-router';
import { connect } from 'react-redux';

export function HealthyFrank({ children, prefetch }) {
  const onPreFetch = () => prefetch({ location: '/healthy-frank/ssr-frank' });
  return (
    <div>
      <h1 className="helloFrank">Im Frank, and healthy</h1>
      <nav>
        <Link to="/healthy-frank/simple">
          simple
        </Link>
        |
        <Link
          className="ssr-frank-link"
          to="/healthy-frank/ssr-frank"
        >
          baby frank
        </Link>
        |
        <Link
          className="prefetch-ssr-frank"
          onMouseOver={onPreFetch}
          onFocus={onPreFetch}
          to="/healthy-frank/ssr-frank"
        >
          prefetch baby frank
        </Link>
      </nav>
      <div>
        { children }
      </div>
      <div>
        <p>footer</p>
      </div>
    </div>
  );
}

HealthyFrank.childRoutes = () => (
  <ModuleRoute>
    <IndexRedirect to="simple" />
    <Route path="simple" component={() => (<p className="simple-child">simple child</p>)} />
    <ModuleRoute path="ssr-frank" moduleName="ssr-frank" />
  </ModuleRoute>
);

HealthyFrank.propTypes = {
  children: PropTypes.node,
  prefetch: PropTypes.func,
};

HealthyFrank.defaultProps = {
  children: null,
  prefetch: () => { /* no op */ },
};

const mapDispatchToProps = (dispatch, { router: { routes } = { routes: [] } }) => ({
  prefetch: ({ location }) => dispatch(moduleRoutePrefetch({ location, routes })),
});

export default connect(null, mapDispatchToProps)(HealthyFrank);
