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

import { argv } from 'yargs';

const lowestToKeep = argv.logLevel;

// error > warn > log > info
const keepInfo = lowestToKeep === 'info';
const keepLog = keepInfo || lowestToKeep === 'log';
const keepWarn = keepInfo || lowestToKeep !== 'error';

const keepList = [
  'error',
  keepWarn ? 'warn' : null,
  keepLog ? 'log' : null,
  keepInfo ? 'info' : null,
].filter(Boolean);

export default function dropEntryBasedOnLevel(level) {
  return keepList.indexOf(level) === -1;
}
