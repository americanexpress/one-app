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

import { register } from '@americanexpress/one-service-worker';

export default async function pwaClient({ enabled, scriptUrl, scope } = {}) {
  if (enabled) {
    // as of now, we are only registering a service worker in pwaClient
    // down the line, we should integrate the PWA state into the store
    // and include a reducer in `one-app-ducks` where we can select PWA
    // state directly from the store and update accordingly with
    // dispatch calls
    return register(scriptUrl, { scope });
  }
  return Promise.resolve();
}
