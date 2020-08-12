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

import { updateLocale } from '@americanexpress/one-app-ducks';
import { composeModules } from 'holocron';
import get from 'lodash.get';

import getDemoProps from './utils/getDemoProps';

// This duck does not have a reducer
export default null;

export function loadModuleData({ store: { dispatch }, ownProps: props }) {
  const { location, params } = props;
  const demoProps = getDemoProps(props);
  const locale = get(location, 'query.locale');

  const promises = [
    dispatch(composeModules([{ name: params.moduleName, props: demoProps }])),
  ];

  return locale
    ? Promise.all([...promises, dispatch(updateLocale(locale))])
    : Promise.all(promises);
}
