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
import { holocronModule } from 'holocron';
import PropTypes from 'prop-types';
import reducer, { FAKE_REQUEST, FAKE_SUCCESS } from '../duck';

const SsrFrank = ({ moduleState }) => (
  <div>
    <h1 className="ssrFrank">SSR Frank!</h1>
    <p className="ssr-frank-loaded-data">{ JSON.stringify(moduleState, null, 2) }</p>
  </div>
);

SsrFrank.loadModuleData = async ({ store, fetchClient }) => {
  store.dispatch({ type: FAKE_REQUEST });
  const fastRes = await fetchClient('https://fast.api.frank/posts');
  const secretMessage = fastRes.headers.get('secret-message');
  const posts = await fastRes.json();
  store.dispatch({
    type: FAKE_SUCCESS,
    data: {
      posts,
      secretMessage,
    },
  });
};

SsrFrank.propTypes = {
  moduleState: PropTypes.shape({
    isLoading: PropTypes.bool.isRequired,
    isComplete: PropTypes.bool.isRequired,
    data: PropTypes.shape({}),
  }).isRequired,
};

export default holocronModule({
  name: 'ssr-frank',
  reducer,
})(SsrFrank);
