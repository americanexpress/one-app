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

import { on } from '@americanexpress/one-service-worker';

import {
  createInstallMiddleware,
  createActivateMiddleware,
} from './middleware';

try {
  on('install', createInstallMiddleware());

  on('activate', createActivateMiddleware());
} catch (error) {
  // due to the script body being able to terminate and cut off any
  // asyncronous behavior before it finishes executing, we need to rely on
  // synchronous calls to the main thread or rely on invoking a global
  // 'error' event handler to triage.
  console.error(error);
  // in the event of any failure during setup, we immediately
  // unregister this service worker
  self.unregister();
}
