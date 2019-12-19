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

// polyfill for the console, don't warn on console usage
/* eslint-disable no-console */

if (!global.console) {
  global.console = {};
}

function noop() {}

// list of methods from
// https://developer.chrome.com/devtools/docs/console-api
[
  'assert',
  'clear',
  'count',
  'debug',
  'dir',
  'dirxml',
  'error',
  'group',
  'groupCollapsed',
  'groupEnd',
  'info',
  'log',
  'profile',
  'profileEnd',
  'time',
  'timeEnd',
  'timeStamp',
  'trace',
  'warn',
]
  .forEach((n) => {
    console[n] = console[n] || noop;
  });
