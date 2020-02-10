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

import { Map as iMap } from 'immutable';

import transit from '../../universal/utils/transit';

// eslint-disable-next-line import/prefer-default-export
export function serializeClientInitialState(clientInitialState) {
  // try to build the full state, this _might_ fail (ex: 'Error serializing unrecognized object')
  try {
    return transit.toJSON(clientInitialState);
  } catch (err) {
    console.error('encountered an error serializing full client initial state', err);

    // clear out an internal cache that corrupts the serialization generated on the next call
    // TODO: understand transit-js and transit-immutable-js internals to properly fix the bug
    // for now stop the bleeding
    transit.toJSON('clear out an internal cache');
  }

  // can't send all the work we've done to build the state, but we can still give the app what it
  // needs to start in the browser
  // this _shouldn't_ ever throw, but just in case...
  try {
    return transit.toJSON(
      iMap({
        config: clientInitialState.get('config'),
        holocron: clientInitialState.get('holocron'),
      })
    );
  } catch (err) {
    transit.toJSON('clear out an internal cache, again');
    // something is really wrong
    console.error('unable to build the most basic initial state for a client to startup', err);
    throw err;
  }
}
