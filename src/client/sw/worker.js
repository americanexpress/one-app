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

// eslint-disable-next-line import/no-extraneous-dependencies
import { on } from '@americanexpress/one-service-worker';

import {
  createInstallMiddleware,
  createActivateMiddleware,
  createFetchMiddleware,
} from './middleware';

try {
  on('install', createInstallMiddleware());

  on('activate', createActivateMiddleware());

  on('fetch', createFetchMiddleware());
} catch (e) {
  // eslint-disable-next-line no-console
  console.error(e);
  // eslint-disable-next-line no-restricted-globals
  self.unregister();
}
