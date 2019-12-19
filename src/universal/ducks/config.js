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

/*
  Environment specific config. The server will get variables from its container at run time
  and add them to the state. We also have different variables for server and client, so
  the server will set the server config variables before server render, and will set
  them to the client config before sending html with initial state.
 */

import { fromJS } from 'immutable';

export const SET_CONFIG = 'global/config/SET_CONFIG';

const initialState = fromJS({});

export default function reducer(state = initialState, action) {
  if (action.type === SET_CONFIG) {
    return fromJS(action.config);
  }

  return state;
}

export function setConfig(config) {
  return {
    type: SET_CONFIG,
    config,
  };
}
