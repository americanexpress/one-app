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
import { RenderModule, composeModules } from 'holocron';
import { connect } from 'react-redux';
import { Map as iMap } from 'immutable';
import { updateLocale, setRenderPartialOnly, setRenderTextOnly } from '@americanexpress/one-app-ducks';

const Partial = ({ params: { moduleName }, location: { query }, postProps }) => (
  <RenderModule
    moduleName={moduleName}
    props={{
      ...postProps,
      ...query,
    }}
  />
);

const propSelector = (state) => state.getIn(['modules', 'frank-lloyd-root', 'postProps'], iMap()).toJS();

export const onPartialRouteEnter = (
  { dispatch, getState },
  partialOnly = false,
  textOnly = false
) => (nextState, replace, cb) => {
  const postProps = propSelector(getState());
  const { locale, moduleName } = nextState.params;
  dispatch(setRenderPartialOnly(partialOnly));
  dispatch(setRenderTextOnly(textOnly, ' '));
  dispatch(updateLocale(locale))
    .then(() => dispatch(composeModules([{
      name: moduleName,
      props: {
        ...postProps,
        ...nextState.location.query,
      },
    }])))
    .then(() => cb());
};

Partial.propTypes = {
  params: PropTypes.shape({
    moduleName: PropTypes.string.isRequired,
  }).isRequired,
  location: PropTypes.shape({
    query: PropTypes.object.isRequired,
  }).isRequired,
  // Props for rendered module are indeterminate
  // eslint-disable-next-line react/forbid-prop-types
  postProps: PropTypes.object.isRequired,
};

export default connect((state) => ({ postProps: propSelector(state) }))(Partial);
