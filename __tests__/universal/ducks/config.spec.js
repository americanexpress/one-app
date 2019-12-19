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

import { fromJS } from 'immutable';
import reducer, { setConfig, SET_CONFIG } from '../../../src/universal/ducks/config';

describe('config duck', () => {
  const config = {
    isTestConfig: true,
    configUrl: 'https://example.com/something',
  };

  const unknownAction = {
    type: 'UNKNOWN_ACTION',
    config,
  };

  const initialState = fromJS({});

  it('exports action type SET_CONFIG', () => {
    expect(SET_CONFIG).toBe('global/config/SET_CONFIG');
  });

  describe('setConfig action creator', () => {
    it('returns action with passed in config', () => {
      expect(setConfig(config)).toMatchSnapshot();
    });
  });

  describe('reducer', () => {
    it('should default to an empty initial state if no state is provided', () => {
      expect(reducer(undefined, unknownAction)).toBe(initialState);
    });

    it('should return immutable config if action type is SET_CONFIG', () => {
      expect(reducer(undefined, setConfig(config))).toMatchSnapshot();
    });

    it('should return initial state if invalid action type is given', () => {
      expect(reducer(undefined, unknownAction)).toBe(initialState);
    });
  });
});
