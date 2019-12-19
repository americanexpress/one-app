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

import {
  fromJS,
} from 'immutable';

export const FAKE_REQUEST = 'modules/ssr-frank/FAKE_REQUEST';
export const FAKE_SUCCESS = 'modules/ssr-frank/FAKE_SUCCESS';
export const FAKE_FAILURE = 'modules/ssr-frank/FAKE_FAILURE';

function buildInitialState() {
  return fromJS({
    isLoading: false,
    isComplete: false,
    data: null,
    error: null,
  });
}

function reducer(state = buildInitialState(), action) {
  switch (action.type) {
    case FAKE_REQUEST:
      return state
        .set('isLoading', true)
        .set('isComplete', false);
    case FAKE_SUCCESS:
      return state
        .set('data', action.data)
        .set('isLoading', false)
        .set('isComplete', true);
    case FAKE_FAILURE:
      return state
        .set('error', action.error)
        .set('isLoading', false)
        .set('isComplete', true);
    default:
      return state;
  }
}

export default reducer;
