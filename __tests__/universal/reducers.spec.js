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

import { createStore } from 'redux';

import reducers from '../../src/universal/reducers';

describe('reducers', () => {
  it('should export a root reducer that can be used to create a store', () => {
    const store = createStore(reducers);
    const state = store.getState();
    // not testing global ducks keys because those should be tested in global ducks
    // TODO: all global reducers should come from global ducks (move api ducks, routing, config)
    expect(state.has('config')).toBe(true);
  });
});
