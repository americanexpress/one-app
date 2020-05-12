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

import {
  on, register, messageContext, messenger,
} from '@americanexpress/one-service-worker';

import { ERROR_MESSAGE_ID_KEY } from './constants';

export default function serviceWorkerClient({
  scriptUrl, scope, onError,
}) {
  // We listen for any messages that come in from the service worker
  on('message', [
    messageContext(),
    messenger({
      [ERROR_MESSAGE_ID_KEY]: onError,
    }),
  ]);

  // as the first basis, we would register the service worker before performing anything else.
  return register(scriptUrl, { scope });
}
