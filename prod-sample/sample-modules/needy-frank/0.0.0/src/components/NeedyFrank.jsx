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
import { compose } from 'redux';
import { holocronModule } from 'holocron';
import { configureIguazuSSR } from 'iguazu-holocron';
import PropTypes from 'prop-types';
import { connectAsync } from 'iguazu';
import { queryProcedureResult } from 'iguazu-rpc';
import reducer from '../duck';

const NeedyFrank = ({ moduleState }) => (
  <div>
    <h1 className="needyFrank">Needy Frank using Iguazu</h1>
    <p className="needy-frank-loaded-data">{ JSON.stringify(moduleState, null, 2) }</p>
  </div>
);

function loadDataAsProps({ store: { dispatch }, ownProps: { location: { query } } }) {
  return {
    posts: () => dispatch(queryProcedureResult({ procedureName: 'readPosts', args: { api: query.api } })),
  };
}

loadDataAsProps.ssr = true;

NeedyFrank.loadDataAsProps = loadDataAsProps;
if (!global.BROWSER) {
  NeedyFrank.loadModuleData = configureIguazuSSR;
}

NeedyFrank.propTypes = {
  moduleState: PropTypes.shape({
    isLoading: PropTypes.bool.isRequired,
    isComplete: PropTypes.bool.isRequired,
    data: PropTypes.shape({}),
  }).isRequired,
};

export default compose(
  holocronModule({
    name: 'needy-frank',
    reducer,
  }),
  connectAsync({ loadDataAsProps })
)(NeedyFrank);
